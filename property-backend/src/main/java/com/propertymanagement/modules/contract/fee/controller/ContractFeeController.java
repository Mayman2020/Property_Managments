package com.propertymanagement.modules.contract.fee.controller;

import com.propertymanagement.modules.contract.fee.dto.ContractFeeRequest;
import com.propertymanagement.modules.contract.fee.entity.ContractFee;
import com.propertymanagement.modules.contract.fee.service.ContractFeeService;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contract-fees")
@RequiredArgsConstructor
public class ContractFeeController {

    private final ContractFeeService feeService;

    @GetMapping("/contract/{contractId}")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<List<ContractFee>>> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.getByContract(contractId)));
    }

    @PostMapping
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractFee>> create(@Valid @RequestBody ContractFeeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.create(request)));
    }

    @PatchMapping("/{id}/mark-paid")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractFee>> markPaid(
            @PathVariable Long id,
            @RequestParam(required = false) String receiptUrl) {
        return ResponseEntity.ok(ApiResponse.ok(feeService.markPaid(id, receiptUrl)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "contracts", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        feeService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
