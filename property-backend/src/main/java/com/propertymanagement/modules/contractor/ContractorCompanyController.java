package com.propertymanagement.modules.contractor;

import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequest;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contractor-companies")
@RequiredArgsConstructor
public class ContractorCompanyController {

    private final ContractorCompanyService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<List<ContractorCompanyResponse>>> list(
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        List<ContractorCompanyResponse> data = all ? service.listAll() : service.listActive();
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.get(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponse>> create(
            @Valid @RequestBody ContractorCompanyRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(dto)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponse>> update(
            @PathVariable Long id, @Valid @RequestBody ContractorCompanyRequest dto) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, dto)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
