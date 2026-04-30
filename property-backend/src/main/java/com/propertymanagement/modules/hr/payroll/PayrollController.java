package com.propertymanagement.modules.hr.payroll;

import com.propertymanagement.modules.hr.payroll.dto.*;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/hr/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<PayrollRunResponse>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> generate(@Valid @RequestBody GeneratePayrollRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll generated successfully", service.generate(request)));
    }

    @PostMapping("/advances")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Long>> createAdvance(@Valid @RequestBody SalaryAdvanceRequest request) {
        SalaryAdvance advance = service.createAdvance(request);
        return ResponseEntity.ok(ApiResponse.ok("Salary advance saved successfully", advance.getId()));
    }

    @PatchMapping("/{id}/payslips/{payslipId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> adjustPayslip(
            @PathVariable Long id,
            @PathVariable Long payslipId,
            @Valid @RequestBody PayslipAdjustRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Payslip updated successfully", service.adjustPayslip(id, payslipId, request)));
    }

    @PostMapping("/{id}/bonuses")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> addBonus(
            @PathVariable Long id,
            @Valid @RequestBody BonusRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Bonus added successfully", service.addBonus(id, request)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll approved successfully", service.approve(id)));
    }

    @PostMapping("/{id}/mark-paid")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','HR_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PayrollRunDetailResponse>> markPaid(
            @PathVariable Long id,
            @Valid @RequestBody PayrollPaidRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Payroll marked as paid", service.markPaid(id, request)));
    }
}
