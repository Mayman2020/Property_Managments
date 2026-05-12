package com.propertymanagement.modules.maintenance.company;

import com.propertymanagement.modules.contractor.service.ContractorCompanyService;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequestDTO;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponseDTO;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Exposes contractor companies as maintenance companies.
 * Reuses ContractorCompanyService to avoid data duplication —
 * contractor companies ARE the external maintenance providers.
 */
@RestController
@RequestMapping("/maintenance-companies")
@RequiredArgsConstructor
public class MaintenanceCompanyController {

    private final ContractorCompanyService service;

    /** GET /maintenance-companies */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<List<ContractorCompanyResponseDTO>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        List<ContractorCompanyResponseDTO> data = all ? service.listAll(q) : service.listActive(q);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    /** GET /maintenance-companies/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.get(id)));
    }

    /** POST /maintenance-companies */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> create(
            @Valid @RequestBody ContractorCompanyRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(dto)));
    }

    /** PUT /maintenance-companies/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> update(
            @PathVariable Long id, @Valid @RequestBody ContractorCompanyRequestDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, dto)));
    }
}
