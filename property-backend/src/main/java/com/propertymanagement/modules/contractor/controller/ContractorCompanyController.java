package com.propertymanagement.modules.contractor.controller;

import com.propertymanagement.modules.contractor.service.ContractorCompanyService;
import com.propertymanagement.modules.contractor.service.CompanyStaffService;
import com.propertymanagement.modules.contractor.dto.AllCompanyOfficerResponse;
import com.propertymanagement.modules.contractor.dto.CompanyOfficerResponse;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequestDTO;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponseDTO;
import com.propertymanagement.modules.contractor.dto.ContractorPropertyContractDto;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contractor-companies")
@RequiredArgsConstructor
public class ContractorCompanyController {

    private final ContractorCompanyService service;
    private final CompanyStaffService companyStaffService;

    @GetMapping
    @RequiresPermission(module = "contractors", action = "view")
    public ResponseEntity<ApiResponse<List<ContractorCompanyResponseDTO>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        List<ContractorCompanyResponseDTO> data = all ? service.listAll(q, propertyId) : service.listActive(q, propertyId);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "contractors", action = "view")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.get(id)));
    }

    @GetMapping("/officers")
    @RequiresPermission(module = "contractors", action = "view")
    public ResponseEntity<ApiResponse<List<AllCompanyOfficerResponse>>> allOfficers() {
        return ResponseEntity.ok(ApiResponse.ok(companyStaffService.listAllOfficers()));
    }

    @GetMapping("/{id}/officers")
    @RequiresPermission(module = "contractors", action = "view")
    public ResponseEntity<ApiResponse<List<CompanyOfficerResponse>>> officers(@PathVariable Long id) {
        service.get(id);
        return ResponseEntity.ok(ApiResponse.ok(companyStaffService.listCompanyOfficers(id)));
    }

    @GetMapping("/{id}/maintenance-contracts")
    @RequiresPermission(module = "contractors", action = "view")
    public ResponseEntity<ApiResponse<List<ContractorPropertyContractDto>>> maintenanceContracts(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMaintenanceContracts(id)));
    }

    @PostMapping
    @RequiresPermission(module = "contractors", action = "create")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> create(
            @Valid @RequestBody ContractorCompanyRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(dto)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "contractors", action = "edit")
    public ResponseEntity<ApiResponse<ContractorCompanyResponseDTO>> update(
            @PathVariable Long id, @Valid @RequestBody ContractorCompanyRequestDTO dto) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, dto)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "contractors", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
