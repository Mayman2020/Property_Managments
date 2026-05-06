package com.propertymanagement.modules.user.dto;

import com.propertymanagement.modules.user.UserRole;
import lombok.Data;

import java.util.List;

@Data
public class UserRoleUpdateRequest {
    /**
     * Legacy single-role update. Used when {@code roles} is null or empty.
     */
    private UserRole role;
    /**
     * When non-empty, assigns this full role set. Stored {@code users.role} is the portal primary
     * (see {@code UserExtraRoles.pickPrimary}); remaining roles are stored in {@code extra_roles}.
     */
    private List<UserRole> roles;
}
