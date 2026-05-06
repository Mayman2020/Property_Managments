package com.propertymanagement.modules.complaint;

import com.propertymanagement.modules.complaint.dto.ComplaintRequest;
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

import java.util.Map;

@RestController
@RequestMapping("/complaints")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','TENANT')")
public class TenantComplaintController {

    private final TenantComplaintService complaintService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<Page<TenantComplaint>>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getAll(pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TenantComplaint>> create(
            @Valid @RequestBody ComplaintRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(complaintService.create(request)));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<TenantComplaint>> assign(
            @PathVariable Long id, @RequestBody Map<String, Long> body) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.assign(id, body.get("officerId"))));
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<TenantComplaint>> resolve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String resolution = body != null ? body.get("resolution") : null;
        return ResponseEntity.ok(ApiResponse.ok(complaintService.resolve(id, resolution)));
    }
}
