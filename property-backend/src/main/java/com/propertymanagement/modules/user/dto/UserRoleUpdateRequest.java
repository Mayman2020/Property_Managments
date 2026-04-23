package com.propertymanagement.modules.user.dto;

import com.propertymanagement.modules.user.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserRoleUpdateRequest {
    @NotNull
    private UserRole role;
}
