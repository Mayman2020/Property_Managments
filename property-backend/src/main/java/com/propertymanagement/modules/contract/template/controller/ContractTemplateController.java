package com.propertymanagement.modules.contract.template.controller;

import com.propertymanagement.modules.contract.template.dto.ContractTemplateRequest;
import com.propertymanagement.modules.contract.template.dto.ContractTemplateResponse;
import com.propertymanagement.shared.response.ApiResponse;
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

import java.util.List;
import com.propertymanagement.modules.contract.template.service.ContractTemplateService;

@RestController
@RequestMapping("/contract-templates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
public class ContractTemplateController {

    private final ContractTemplateService templateService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ContractTemplateResponse>>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(templateService.getAll(pageable)));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ContractTemplateResponse>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(templateService.getActive()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractTemplateResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(templateService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<ContractTemplateResponse>> create(
            @Valid @RequestBody ContractTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(templateService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<ContractTemplateResponse>> update(
            @PathVariable Long id, @Valid @RequestBody ContractTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(templateService.update(id, request)));
    }
}
