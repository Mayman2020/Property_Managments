package com.propertymanagement.modules.contract.annex.controller;

import com.propertymanagement.modules.contract.annex.dto.ContractAnnexRequest;
import com.propertymanagement.modules.contract.annex.dto.ContractAnnexResponse;
import com.propertymanagement.modules.contract.annex.service.ContractAnnexService;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contracts/{contractId}/annexes")
@RequiredArgsConstructor
public class ContractAnnexController {

    private final ContractAnnexService service;

    @GetMapping
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<List<ContractAnnexResponse>>> list(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByContract(contractId)));
    }

    @PostMapping
    @RequiresPermission(module = "contracts", action = "create")
    public ResponseEntity<ApiResponse<ContractAnnexResponse>> create(
            @PathVariable Long contractId,
            @Valid @RequestBody ContractAnnexRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(contractId, request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractAnnexResponse>> update(
            @PathVariable Long contractId,
            @PathVariable Long id,
            @Valid @RequestBody ContractAnnexRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "contracts", action = "delete")
    public ResponseEntity<Void> delete(@PathVariable Long contractId, @PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
