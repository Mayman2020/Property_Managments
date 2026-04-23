package com.propertymanagement.modules.permission;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.propertymanagement.modules.permission.dto.RolePermissionResponse;
import com.propertymanagement.modules.permission.dto.RolePermissionUpdateRequest;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRole;
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

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private static final TypeReference<Map<String, Map<String, Boolean>>> MAP_TYPE = new TypeReference<>() {};

    private final RolePermissionRepository repository;
    private final ObjectMapper objectMapper;

    public List<RolePermissionResponse> getAll() {
        List<RolePermissionResponse> result = new ArrayList<>();
        for (UserRole role : UserRole.values()) {
            result.add(toResponse(findOrCreate(role)));
        }
        return result;
    }

    public RolePermissionResponse getByRole(UserRole role) {
        return toResponse(findOrCreate(role));
    }

    public RolePermissionResponse getMyPermissions() {
        return getByRole(currentUserRole());
    }

    @Transactional
    public RolePermissionResponse update(UserRole role, RolePermissionUpdateRequest request) {
        RolePermission entity = findOrCreate(role);
        entity.setPermissionsJson(writePermissions(request.getPermissions()));
        return toResponse(repository.save(entity));
    }

    public Map<String, Map<String, Boolean>> getPermissionMap(UserRole role) {
        return readPermissions(findOrCreate(role).getPermissionsJson());
    }

    private RolePermission findOrCreate(UserRole role) {
        return repository.findById(role).orElseGet(() -> repository.save(
                RolePermission.builder()
                        .role(role)
                        .permissionsJson(writePermissions(defaultPermissions(role)))
                        .build()
        ));
    }

    private RolePermissionResponse toResponse(RolePermission entity) {
        return RolePermissionResponse.builder()
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

    private UserRole currentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getRole() != null) {
            return user.getRole();
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    public static Map<String, Map<String, Boolean>> defaultPermissions(UserRole role) {
        Map<String, Map<String, Boolean>> permissions = baseCatalog();
        switch (role) {
            case SUPER_ADMIN -> permissions.replaceAll((key, value) -> fillTrue(value));
            case PROPERTY_ADMIN -> {
                allow(permissions, "dashboard", "enabled", "menu", "view");
                allow(permissions, "properties", "enabled", "menu", "view", "create", "edit");
                allow(permissions, "units", "enabled", "menu", "view", "create", "edit", "toggle");
                allow(permissions, "tenants", "enabled", "menu", "view", "create", "edit", "delete");
                allow(permissions, "maintenance", "enabled", "menu", "view", "create", "edit", "assign", "schedule");
                allow(permissions, "inventory", "enabled", "menu", "view", "create", "edit");
                allow(permissions, "reports", "enabled", "menu", "view", "export");
                allow(permissions, "users", "enabled", "menu", "view");
                allow(permissions, "contractors", "enabled", "menu", "view", "create", "edit");
                allow(permissions, "ratings", "enabled", "menu", "view");
                allow(permissions, "profile", "enabled", "menu", "view", "edit");
            }
            case MAINTENANCE_OFFICER -> {
                allow(permissions, "schedule", "enabled", "menu", "view", "start");
                allow(permissions, "my_requests", "enabled", "menu", "view", "start", "submit", "schedule");
                allow(permissions, "maintenance", "enabled", "view", "start", "submit", "schedule");
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
                "profile", "my_unit", "new_request", "my_requests", "permissions"
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
