package com.propertymanagement.modules.hr.leave.controller;

import com.propertymanagement.modules.hr.leave.dto.LeaveRequestResponse;
import com.propertymanagement.modules.hr.leave.dto.CreateLeaveRequest;
import com.propertymanagement.modules.hr.leave.dto.EmployeeLeaveBalanceResponse;
import com.propertymanagement.modules.hr.leave.dto.LeaveDecisionRequest;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import com.propertymanagement.modules.hr.leave.service.LeaveService;
import com.propertymanagement.modules.owner.entity.Owner;

@RestController
@RequestMapping("/hr/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','PROCEDURES_CLERK','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<Page<LeaveRequestResponse>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable)));
    }

    @GetMapping("/balances")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','PROCEDURES_CLERK','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<EmployeeLeaveBalanceResponse>>> balances(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.ok(service.balancesForProperty(propertyId, year)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','PROCEDURES_CLERK','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> create(@Valid @RequestBody CreateLeaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(request)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) LeaveDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.approve(id, request == null ? new LeaveDecisionRequest() : request)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) LeaveDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.reject(id, request == null ? new LeaveDecisionRequest() : request)));
    }
}
