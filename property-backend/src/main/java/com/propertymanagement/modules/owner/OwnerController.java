package com.propertymanagement.modules.owner;

import com.propertymanagement.modules.owner.dto.LinkUserRequest;
import com.propertymanagement.modules.owner.dto.OwnerRequest;
import com.propertymanagement.modules.owner.dto.OwnerResponse;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/owners")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT')")
public class OwnerController {

    private final OwnerService ownerService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OwnerResponse>>> getAll(
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(ownerService.getAll(pageable, propertyId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OwnerResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ownerService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OwnerResponse>> create(@Valid @RequestBody OwnerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(ownerService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OwnerResponse>> update(
            @PathVariable Long id, @Valid @RequestBody OwnerRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(ownerService.update(id, request)));
    }

    @PatchMapping("/{id}/link-user")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<OwnerResponse>> linkUser(
            @PathVariable Long id, @RequestBody LinkUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(ownerService.linkUser(id, request)));
    }

    @GetMapping("/owner-users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getOwnerUsers() {
        Page<UserResponse> page = userService.getAll(PageRequest.of(0, 200), null, UserRole.OWNER);
        return ResponseEntity.ok(ApiResponse.ok(page.getContent()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        ownerService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
