package com.propertymanagement.modules.contract.payment.controller;

import com.propertymanagement.modules.contract.payment.dto.PaymentResponse;
import com.propertymanagement.modules.contract.payment.dto.RecordPaymentDto;
import com.propertymanagement.modules.contract.payment.dto.ReviewPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.contract.payment.dto.AccountantMarkPaidRequest;
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
import com.propertymanagement.modules.contract.payment.service.RentPaymentService;
import com.propertymanagement.modules.user.entity.User;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
public class RentPaymentController {

    private final RentPaymentService paymentService;

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<Page<PaymentResponse>>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getAll(pageable)));
    }

    @GetMapping("/payments/overdue")
    public ResponseEntity<ApiResponse<List<ScheduleItemResponse>>> getOverdue(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getOverdueSchedule(propertyId)));
    }

    @GetMapping("/payments/contract/{contractId}")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getByContract(
            @PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getByContract(contractId)));
    }

    @GetMapping("/contracts/{contractId}/payment-schedule")
    public ResponseEntity<ApiResponse<Page<ScheduleItemResponse>>> getSchedule(
            @PathVariable Long contractId,
            @PageableDefault(size = 240, sort = "dueDate", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getSchedule(contractId, pageable)));
    }

    @GetMapping("/payments/proofs/pending")
    public ResponseEntity<ApiResponse<List<ScheduleItemResponse>>> getPendingProofs() {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getPendingProofs()));
    }

    @PatchMapping("/payment-schedule/{scheduleId}/proof/review")
    public ResponseEntity<ApiResponse<ScheduleItemResponse>> reviewProof(
            @PathVariable Long scheduleId,
            @Valid @RequestBody ReviewPaymentProofRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.reviewProof(scheduleId, req, currentUserId())));
    }

    @PostMapping("/payment-schedule/{scheduleId}/mark-paid")
    public ResponseEntity<ApiResponse<ScheduleItemResponse>> markPaid(
            @PathVariable Long scheduleId,
            @RequestBody(required = false) AccountantMarkPaidRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.markPaidByAccountant(scheduleId, req, currentUserId())));
    }

    @PostMapping("/payments")
    public ResponseEntity<ApiResponse<PaymentResponse>> record(
            @Valid @RequestBody RecordPaymentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(paymentService.recordPayment(dto)));
    }

    private Long currentUserId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.propertymanagement.modules.user.entity.User user && user.getId() != null) {
            return user.getId();
        }
        throw com.propertymanagement.shared.exception.AppException.forbidden("Authenticated user is required");
    }
}
