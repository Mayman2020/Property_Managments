package com.propertymanagement.modules.hr.payroll.controller;

import com.propertymanagement.modules.hr.payroll.dto.PayrollDeductionDecisionRequest;
import com.propertymanagement.modules.hr.payroll.dto.PayrollDeductionRequest;
import com.propertymanagement.modules.hr.payroll.dto.PayrollDeductionResponse;
import com.propertymanagement.modules.hr.payroll.service.PayrollDeductionService;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/hr/deductions")
@RequiredArgsConstructor
public class PayrollDeductionController {

    private final PayrollDeductionService service;

    @GetMapping
    @RequiresPermission(module = "hr", action = "view")
    public ResponseEntity<ApiResponse<Page<PayrollDeductionResponse>>> list(
            @RequestParam(required = false) Long employeeId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.list(pageable, employeeId)));
    }

    @PostMapping
    @RequiresPermission(module = "hr", action = "create")
    public ResponseEntity<ApiResponse<PayrollDeductionResponse>> create(@Valid @RequestBody PayrollDeductionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(request)));
    }

    @PostMapping("/{id}/send")
    @RequiresPermission(module = "hr", action = "submit")
    public ResponseEntity<ApiResponse<PayrollDeductionResponse>> send(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.send(id)));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(module = "hr", action = "approve")
    public ResponseEntity<ApiResponse<PayrollDeductionResponse>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) PayrollDeductionDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.approve(id, request)));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(module = "hr", action = "reject")
    public ResponseEntity<ApiResponse<PayrollDeductionResponse>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) PayrollDeductionDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.reject(id, request)));
    }
}
