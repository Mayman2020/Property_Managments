package com.propertymanagement.modules.user.controller;

import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.dto.UserProfileUpdateRequest;
import com.propertymanagement.modules.user.dto.ChangePasswordRequest;
import com.propertymanagement.modules.user.dto.UserRoleUpdateRequest;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.shared.response.ApiResponse;
import com.propertymanagement.shared.security.PropertyAccessSummary;
import com.propertymanagement.shared.security.PropertyScopeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.propertymanagement.modules.user.service.UserService;
import com.propertymanagement.modules.user.entity.UserRole;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PropertyScopeService propertyScopeService;

    @GetMapping
    @RequiresPermission(module = "users", action = "view")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserRole role,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAll(pageable, q, role)));
    }

    @GetMapping("/maintenance-assignable-contractor")
    @RequiresPermission(module = "maintenance", action = "assign")
    public ResponseEntity<ApiResponse<java.util.List<UserResponse>>> maintenanceAssignableContractorOfficers(
            @RequestParam Long propertyId,
            @RequestParam Long contractorCompanyId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.findAssignableContractorOfficers(propertyId, contractorCompanyId)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "users", action = "view")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(module = "users", action = "create")
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(userService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "users", action = "edit")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.update(id, request)));
    }

    @PatchMapping("/{id}/toggle-active")
    @RequiresPermission(module = "users", action = "toggle")
    public ResponseEntity<ApiResponse<UserResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "users", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PatchMapping("/{id}/role")
    @RequiresPermission(module = "users", action = "manage")
    public ResponseEntity<ApiResponse<UserResponse>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UserRoleUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateRole(id, request)));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile()));
    }

    @GetMapping("/me/property-access")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PropertyAccessSummary>> getMyPropertyAccess() {
        return ResponseEntity.ok(ApiResponse.ok(propertyScopeService.getMyPropertyAccessSummary()));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> updateMyProfile(
            @Valid @RequestBody UserProfileUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateMyProfile(request)));
    }

    @PutMapping("/me/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> changeMyPassword(
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changeMyPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
