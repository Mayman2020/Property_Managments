package com.propertymanagement.modules.permission.service;

import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Central permission check used by {@link com.propertymanagement.modules.permission.aspect.PermissionAspect}.
 * Reads the DB-stored role_permissions matrix for the currently authenticated user's active role
 * (respecting the {@code X-Active-Role} header for multi-role users).
 */
@Service
@RequiredArgsConstructor
public class PermissionEvaluatorService {

    private final RolePermissionService rolePermissionService;
    private final PropertyScopeService propertyScopeService;

    /**
     * Throws 403 if the current user's DB permissions do not grant {@code action} on {@code module}.
     * SUPER_ADMIN always passes. Multi-role users are checked against their active role.
     */
    public void assertCan(String module, String action) {
        User user = resolveCurrentUser();
        if (user.getRole() == UserRole.SUPER_ADMIN) return;

        UserRole effectiveRole = propertyScopeService.resolveEffectiveRole(user);

        // For multi-role users: OR-merge permissions from all assigned roles if no specific active role.
        Map<String, Map<String, Boolean>> permissions;
        if (user.getAllAssignedRoles().size() > 1 && effectiveRole == user.getRole()) {
            // Merge all roles
            List<Map<String, Map<String, Boolean>>> maps = user.getAllAssignedRoles().stream()
                    .map(rolePermissionService::getPermissionMap)
                    .toList();
            permissions = RolePermissionService.mergePermissionMaps(maps);
        } else {
            permissions = rolePermissionService.getPermissionMap(effectiveRole);
        }

        Map<String, Boolean> modulePerms = permissions.get(module);
        if (modulePerms == null || Boolean.FALSE.equals(modulePerms.get("enabled"))) {
            throw AppException.forbidden("Access denied: module '" + module + "' is not enabled for your role");
        }
        if (!Boolean.TRUE.equals(modulePerms.get(action))) {
            throw AppException.forbidden("Access denied: action '" + action + "' on module '" + module + "' is not allowed for your role");
        }
    }

    /** Returns true without throwing — useful for conditional logic in services. */
    public boolean can(String module, String action) {
        try {
            assertCan(module, action);
            return true;
        } catch (AppException e) {
            return false;
        }
    }

    private User resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw AppException.forbidden("Authentication required");
        }
        return user;
    }
}
