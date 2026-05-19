package com.propertymanagement.modules.hr.leave.controller;

import com.propertymanagement.modules.hr.leave.dto.LeaveRequestResponse;
import com.propertymanagement.modules.hr.leave.dto.CreateLeaveRequest;
import com.propertymanagement.modules.hr.leave.dto.EmployeeLeaveBalanceResponse;
import com.propertymanagement.modules.hr.leave.dto.LeaveDecisionRequest;
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

import java.util.List;
import com.propertymanagement.modules.hr.leave.service.LeaveService;

@RestController
@RequestMapping("/hr/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService service;

    @GetMapping
    @RequiresPermission(module = "hr", action = "view")
    public ResponseEntity<ApiResponse<Page<LeaveRequestResponse>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable)));
    }

    @GetMapping("/balances")
    @RequiresPermission(module = "hr", action = "view")
    public ResponseEntity<ApiResponse<List<EmployeeLeaveBalanceResponse>>> balances(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.ok(service.balancesForProperty(propertyId, year)));
    }

    @PostMapping
    @RequiresPermission(module = "hr", action = "create")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> create(@Valid @RequestBody CreateLeaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(request)));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(module = "hr", action = "approve")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) LeaveDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.approve(id, request == null ? new LeaveDecisionRequest() : request)));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(module = "hr", action = "reject")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) LeaveDecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.reject(id, request == null ? new LeaveDecisionRequest() : request)));
    }
}
