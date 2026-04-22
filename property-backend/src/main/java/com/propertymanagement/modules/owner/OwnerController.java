package com.propertymanagement.modules.owner;

import com.propertymanagement.modules.owner.dto.OwnerRequest;
import com.propertymanagement.modules.owner.dto.OwnerResponse;
import com.propertymanagement.shared.response.ApiResponse;
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
@RequestMapping("/owners")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
public class OwnerController {

    private final OwnerService ownerService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OwnerResponse>>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(ownerService.getAll(pageable)));
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        ownerService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
