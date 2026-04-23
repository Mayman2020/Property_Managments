package com.propertymanagement.modules.permission.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class RolePermissionUpdateRequest {
    @NotNull
    private Map<String, Map<String, Boolean>> permissions;
}
