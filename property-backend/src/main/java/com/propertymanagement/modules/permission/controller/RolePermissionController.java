package com.propertymanagement.modules.permission.controller;

import com.propertymanagement.modules.permission.service.RolePermissionService;
import com.propertymanagement.modules.permission.dto.RolePermissionResponseDTO;
import com.propertymanagement.modules.permission.dto.RolePermissionUpdateRequestDTO;
import com.propertymanagement.modules.user.entity.UserRole;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/role-permissions")
@RequiredArgsConstructor
public class RolePermissionController {

    private final RolePermissionService service;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<RolePermissionResponseDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RolePermissionResponseDTO>> getMine(
            @RequestParam(name = "role", required = false) UserRole role) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyPermissions(role)));
    }

    @PutMapping("/{role}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<RolePermissionResponseDTO>> update(
            @PathVariable UserRole role,
            @Valid @RequestBody RolePermissionUpdateRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(role, request)));
    }
}
