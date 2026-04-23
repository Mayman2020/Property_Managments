package com.propertymanagement.modules.permission;

import com.propertymanagement.modules.permission.dto.RolePermissionResponse;
import com.propertymanagement.modules.permission.dto.RolePermissionUpdateRequest;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/role-permissions")
@RequiredArgsConstructor
public class RolePermissionController {

    private final RolePermissionService service;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<RolePermissionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RolePermissionResponse>> getMine() {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyPermissions()));
    }

    @PutMapping("/{role}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<RolePermissionResponse>> update(
            @PathVariable UserRole role,
            @Valid @RequestBody RolePermissionUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(role, request)));
    }
}
