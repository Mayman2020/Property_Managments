package com.propertymanagement.modules.user;

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
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PropertyScopeService propertyScopeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserRole role,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAll(pageable, q, role)));
    }

    @GetMapping("/maintenance-assignable-contractor")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER', 'MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<java.util.List<UserResponse>>> maintenanceAssignableContractorOfficers(
            @RequestParam Long propertyId,
            @RequestParam Long contractorCompanyId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.findAssignableContractorOfficers(propertyId, contractorCompanyId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'OWNER')")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(userService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.update(id, request)));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
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

    /** Property ids for the current {@code X-Active-Role} (or primary role); used for scoped UI filters. */
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
