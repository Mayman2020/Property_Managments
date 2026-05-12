package com.propertymanagement.modules.permission.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.propertymanagement.modules.permission.entity.RolePermissionEntity;
import com.propertymanagement.modules.permission.repository.RolePermissionRepository;
import com.propertymanagement.modules.permission.dto.RolePermissionResponseDTO;
import com.propertymanagement.modules.permission.dto.RolePermissionUpdateRequestDTO;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private static final TypeReference<Map<String, Map<String, Boolean>>> MAP_TYPE = new TypeReference<>() {};

    private final RolePermissionRepository repository;
    private final ObjectMapper objectMapper;

    public List<RolePermissionResponseDTO> getAll() {
        List<RolePermissionResponseDTO> result = new ArrayList<>();
        for (UserRole role : UserRole.values()) {
            result.add(toResponse(findOrCreate(role)));
        }
        return result;
    }

    public RolePermissionResponseDTO getByRole(UserRole role) {
        return toResponse(findOrCreate(role));
    }

    public RolePermissionResponseDTO getMyPermissions(UserRole selectedRole) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user) || user.getRole() == null) {
            throw AppException.forbidden("Authenticated user is required");
        }
        if (selectedRole != null) {
            if (!user.getAllAssignedRoles().contains(selectedRole)) {
                throw AppException.forbidden("Selected role is not assigned to this user");
            }
            return RolePermissionResponseDTO.builder()
                    .role(selectedRole)
                    .permissions(getPermissionMap(selectedRole))
                    .build();
        }
        List<Map<String, Map<String, Boolean>>> maps = new ArrayList<>();
        for (UserRole r : user.getAllAssignedRoles()) {
            maps.add(getPermissionMap(r));
        }
        return RolePermissionResponseDTO.builder()
                .role(user.getRole())
                .permissions(mergePermissionMaps(maps))
                .build();
    }

    /**
     * OR-merge module/action flags (union of access from several portal roles).
     */
    public static Map<String, Map<String, Boolean>> mergePermissionMaps(List<Map<String, Map<String, Boolean>>> maps) {
        if (maps == null || maps.isEmpty()) {
            return new LinkedHashMap<>();
        }
        Map<String, Map<String, Boolean>> out = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, Boolean>> entry : maps.get(0).entrySet()) {
            out.put(entry.getKey(), new LinkedHashMap<>(entry.getValue()));
        }
        for (int i = 1; i < maps.size(); i++) {
            Map<String, Map<String, Boolean>> next = maps.get(i);
            if (next == null) {
                continue;
            }
            for (Map.Entry<String, Map<String, Boolean>> e : out.entrySet()) {
                Map<String, Boolean> dest = e.getValue();
                Map<String, Boolean> src = next.get(e.getKey());
                if (src == null) {
                    continue;
                }
                for (String action : dest.keySet()) {
                    dest.put(action, Boolean.TRUE.equals(dest.get(action)) || Boolean.TRUE.equals(src.get(action)));
                }
            }
        }
        return out;
    }

    @Transactional
    public RolePermissionResponseDTO update(UserRole role, RolePermissionUpdateRequestDTO request) {
        RolePermissionEntity entity = findOrCreate(role);
        entity.setPermissionsJson(writePermissions(request.getPermissions()));
        return toResponse(repository.save(entity));
    }

    public Map<String, Map<String, Boolean>> getPermissionMap(UserRole role) {
        Map<String, Map<String, Boolean>> stored = readPermissions(findOrCreate(role).getPermissionsJson());
        if (role == UserRole.ACCOUNTANT) {
            return mergePermissionMaps(List.of(stored, defaultPermissions(UserRole.ACCOUNTANT)));
        }
        return stored;
    }

    private RolePermissionEntity findOrCreate(UserRole role) {
        return repository.findById(role).orElseGet(() -> repository.save(
                RolePermissionEntity.builder()
                        .role(role)
                        .permissionsJson(writePermissions(defaultPermissions(role)))
                        .build()
        ));
    }

    private RolePermissionResponseDTO toResponse(RolePermissionEntity entity) {
        return RolePermissionResponseDTO.builder()
                .role(entity.getRole())
                .permissions(readPermissions(entity.getPermissionsJson()))
                .build();
    }

    private Map<String, Map<String, Boolean>> readPermissions(String raw) {
        try {
            Map<String, Map<String, Boolean>> parsed = objectMapper.readValue(raw, MAP_TYPE);
            return normalize(parsed);
        } catch (Exception e) {
            throw AppException.badRequest("Invalid permissions configuration");
        }
    }

    private String writePermissions(Map<String, Map<String, Boolean>> permissions) {
        try {
            return objectMapper.writeValueAsString(normalize(permissions));
        } catch (Exception e) {
            throw AppException.badRequest("Unable to save permissions");
        }
    }

    private Map<String, Map<String, Boolean>> normalize(Map<String, Map<String, Boolean>> permissions) {
        Map<String, Map<String, Boolean>> normalized = new LinkedHashMap<>();
        Map<String, Map<String, Boolean>> source = permissions != null ? permissions : new LinkedHashMap<>();
        Map<String, Map<String, Boolean>> defaults = defaultPermissions(UserRole.SUPER_ADMIN);
        for (Map.Entry<String, Map<String, Boolean>> entry : defaults.entrySet()) {
            Map<String, Boolean> current = new LinkedHashMap<>();
            Map<String, Boolean> incoming = source.getOrDefault(entry.getKey(), Map.of());
            for (String action : entry.getValue().keySet()) {
                current.put(action, Boolean.TRUE.equals(incoming.get(action)));
            }
            normalized.put(entry.getKey(), current);
        }
        return normalized;
    }

    public static Map<String, Map<String, Boolean>> defaultPermissions(UserRole role) {
        Map<String, Map<String, Boolean>> permissions = baseCatalog();
        switch (role) {
            case SUPER_ADMIN -> permissions.replaceAll((key, value) -> fillTrue(value));
            case GENERAL_MANAGER -> {
                allow(permissions, "dashboard", "enabled", "menu", "view");
                allow(permissions, "properties", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "units", "enabled", "menu", "view", "create", "edit", "toggle", "export");
                allow(permissions, "tenants", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "maintenance", "enabled", "menu", "view", "create", "edit", "assign", "schedule", "approve", "reject", "export");
                allow(permissions, "inventory", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "reports", "enabled", "menu", "view", "export");
                allow(permissions, "users", "enabled", "menu", "view");
                allow(permissions, "contractors", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "ratings", "enabled", "menu", "view", "export");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
                allow(permissions, "contracts", "enabled", "menu", "view", "approve", "reject", "export");
                allow(permissions, "finance", "enabled", "menu", "view", "approve", "reject", "export");
                allow(permissions, "hr", "enabled", "menu", "view", "export");
                allow(permissions, "vacancies", "enabled", "menu", "view", "export");
                allow(permissions, "owner_portal", "enabled", "menu", "view", "approve", "reject", "export");
                allow(permissions, "notifications", "enabled", "menu", "view");
                allow(permissions, "audit", "enabled", "menu", "view", "export");
            }
            case ACCOUNTANT -> {
                allow(permissions, "dashboard", "enabled", "menu", "view");
                allow(permissions, "properties", "enabled", "menu", "view", "create", "edit", "delete", "export");
                allow(permissions, "units", "enabled", "menu", "view", "create", "edit", "delete", "toggle", "export");
                allow(permissions, "tenants", "enabled", "menu", "view", "create", "edit", "delete", "export");
                allow(permissions, "maintenance", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "inventory", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "reports", "enabled", "menu", "view", "export");
                allow(permissions, "users", "enabled", "menu", "view");
                allow(permissions, "contractors", "enabled", "menu", "view", "export");
                allow(permissions, "ratings", "enabled", "menu", "view", "export");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
                allow(permissions, "contracts", "enabled", "menu", "view", "create", "edit", "delete", "approve", "reject", "export");
                allow(permissions, "finance", "enabled", "menu", "view", "create", "edit", "delete", "approve", "reject", "export");
                allow(permissions, "hr", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "vacancies", "enabled", "menu", "view", "create", "edit", "export");
                allow(permissions, "notifications", "enabled", "menu", "view");
                allow(permissions, "audit", "enabled", "menu", "view", "export");
            }
            case MAINTENANCE_OFFICER_INTERNAL,
                 MAINTENANCE_OFFICER_COMPANY,
                 MAINTENANCE_COMPANY -> {
                allow(permissions, "schedule", "enabled", "menu", "view", "start");
                allow(permissions, "my_requests", "enabled", "menu", "view", "start", "submit", "schedule");
                allow(permissions, "maintenance", "enabled", "view", "start", "submit", "schedule");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
            }
            case PROPERTY_GUARD -> {
                allow(permissions, "dashboard", "enabled", "menu", "view");
                allow(permissions, "maintenance", "enabled", "menu", "view");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
            }
            case PROCEDURES_CLERK -> {
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
                allow(permissions, "hr", "enabled", "menu", "view");
            }
            case OWNER -> {
                // Broad admin navigation: read-only modules + approvals where the business allows.
                allow(permissions, "dashboard", "enabled", "menu", "view");
                allow(permissions, "properties", "enabled", "menu", "view", "export");
                allow(permissions, "units", "enabled", "menu", "view", "export");
                allow(permissions, "tenants", "enabled", "menu", "view", "export");
                allow(permissions, "maintenance", "enabled", "menu", "view", "export");
                allow(permissions, "inventory", "enabled", "menu", "view", "export");
                allow(permissions, "reports", "enabled", "menu", "view", "export");
                allow(permissions, "contractors", "enabled", "menu", "view", "export");
                allow(permissions, "contracts", "enabled", "menu", "view", "approve", "reject", "export");
                allow(permissions, "finance", "enabled", "menu", "view", "export");
                allow(permissions, "hr", "enabled", "menu", "view", "export");
                allow(permissions, "notifications", "enabled", "menu", "view");
                allow(permissions, "audit", "enabled", "menu", "view", "export");
                allow(permissions, "owner_portal", "enabled", "menu", "view", "approve", "reject", "export");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
            }
            case TENANT -> {
                allow(permissions, "my_unit", "enabled", "menu", "view");
                allow(permissions, "new_request", "enabled", "menu", "view", "create");
                allow(permissions, "my_requests", "enabled", "menu", "view", "approve", "reject", "rate");
                allow(permissions, "maintenance", "enabled", "view", "create", "approve", "reject", "rate");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
            }
        }
        return permissions;
    }

    private static Map<String, Map<String, Boolean>> baseCatalog() {
        String[] modules = {
                "dashboard", "properties", "units", "tenants", "maintenance", "inventory",
                "reports", "users", "lookups", "contractors", "ratings", "schedule",
                "profile", "my_unit", "new_request", "my_requests", "permissions",
                "contracts", "finance", "hr", "owner_portal", "vacancies", "notifications", "audit"
        };
        String[] actions = {
                "enabled", "menu", "view", "create", "edit", "delete", "assign", "schedule",
                "start", "submit", "approve", "reject", "export", "rate", "manage", "toggle"
        };
        Map<String, Map<String, Boolean>> catalog = new LinkedHashMap<>();
        for (String module : modules) {
            Map<String, Boolean> flags = new LinkedHashMap<>();
            for (String action : actions) {
                flags.put(action, false);
            }
            catalog.put(module, flags);
        }
        return catalog;
    }

    private static void allow(Map<String, Map<String, Boolean>> permissions, String module, String... actions) {
        Map<String, Boolean> flags = permissions.get(module);
        if (flags == null) return;
        for (String action : actions) {
            flags.put(action, true);
        }
    }

    private static Map<String, Boolean> fillTrue(Map<String, Boolean> value) {
        Map<String, Boolean> all = new LinkedHashMap<>();
        for (String action : value.keySet()) {
            all.put(action, true);
        }
        return all;
    }
}
