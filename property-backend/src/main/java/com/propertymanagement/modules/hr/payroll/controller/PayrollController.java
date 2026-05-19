package com.propertymanagement.modules.hr.payroll.controller;

import com.propertymanagement.modules.hr.payroll.dto.*;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.propertymanagement.modules.hr.payroll.service.PayrollService;

import java.util.List;

@RestController
@RequestMapping("/hr/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService service;

    @GetMapping
    @RequiresPermission(module = "hr", action = "view")
    public ResponseEntity<ApiResponse<Page<PayrollRunResponse>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "hr", action = "view")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping("/generate")
    @RequiresPermission(module = "hr", action = "create")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> generate(@Valid @RequestBody GeneratePayrollRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll generated successfully", service.generate(request)));
    }

    @PostMapping("/advances")
    @RequiresPermission(module = "hr", action = "create")
    public ResponseEntity<ApiResponse<Long>> createAdvance(@Valid @RequestBody SalaryAdvanceRequest request) {
        var advance = service.createAdvance(request);
        return ResponseEntity.ok(ApiResponse.ok("Salary advance saved successfully", advance.getId()));
    }

    @PatchMapping("/{id}/payslips/{payslipId}")
    @RequiresPermission(module = "hr", action = "edit")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> adjustPayslip(
            @PathVariable Long id,
            @PathVariable Long payslipId,
            @Valid @RequestBody PayslipAdjustRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Payslip updated successfully", service.adjustPayslip(id, payslipId, request)));
    }

    @PostMapping("/{id}/bonuses")
    @RequiresPermission(module = "hr", action = "edit")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> addBonus(
            @PathVariable Long id,
            @Valid @RequestBody BonusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Bonus added successfully", service.addBonus(id, request)));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(module = "hr", action = "approve")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll approved successfully", service.approve(id)));
    }

    @PostMapping("/{id}/mark-paid")
    @RequiresPermission(module = "hr", action = "manage")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> markPaid(
            @PathVariable Long id,
            @Valid @RequestBody PayrollPaidRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll marked as paid", service.markPaid(id, request)));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(module = "hr", action = "approve")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> reject(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll rejected", service.reject(id, reason)));
    }

    /** Employee-facing: returns only the caller's own payslips. */
    @GetMapping("/my-payslips")
    public ResponseEntity<ApiResponse<List<PayslipResponse>>> getMyPayslips() {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyPayslips()));
    }

    @GetMapping("/my-payslips/{payslipId}")
    public ResponseEntity<ApiResponse<PayslipResponse>> getMyPayslipById(@PathVariable Long payslipId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyPayslipById(payslipId)));
    }
}
