package com.propertymanagement.modules.contractor.controller;

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

@RestController
@RequestMapping("/contractor-companies")
@RequiredArgsConstructor
public class ContractorCompanyController {

    private final ContractorCompanyService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<ContractorCompanyResponseDTO>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        List<ContractorCompanyResponseDTO> data = all ? service.listAll(q, propertyId) : service.listActive(q, propertyId);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.get(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> create(
            @Valid @RequestBody ContractorCompanyRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(dto)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> update(
            @PathVariable Long id, @Valid @RequestBody ContractorCompanyRequestDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, dto)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
