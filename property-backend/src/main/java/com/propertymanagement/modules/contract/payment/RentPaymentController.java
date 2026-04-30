package com.propertymanagement.modules.contract.payment;

import com.propertymanagement.modules.contract.payment.dto.PaymentResponse;
import com.propertymanagement.modules.contract.payment.dto.RecordPaymentDto;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER','ACCOUNTANT')")
public class RentPaymentController {

    private final RentPaymentService paymentService;

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<Page<PaymentResponse>>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getAll(pageable)));
    }

    @GetMapping("/payments/overdue")
    public ResponseEntity<ApiResponse<List<ScheduleItemResponse>>> getOverdue() {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getOverdueSchedule()));
    }

    @GetMapping("/payments/contract/{contractId}")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getByContract(
            @PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getByContract(contractId)));
    }

    @GetMapping("/contracts/{contractId}/payment-schedule")
    public ResponseEntity<ApiResponse<List<ScheduleItemResponse>>> getSchedule(
            @PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getSchedule(contractId)));
    }

    @PostMapping("/payments")
    public ResponseEntity<ApiResponse<PaymentResponse>> record(
            @Valid @RequestBody RecordPaymentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(paymentService.recordPayment(dto)));
    }
}
