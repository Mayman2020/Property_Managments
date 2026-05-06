package com.propertymanagement.modules.contract.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class PaymentResponse {
    private Long id;
    private Long scheduleId;
    private Long contractId;
    private String contractNumber;
    private Long tenantId;
    private String tenantName;
    private LocalDate paymentDate;
    private BigDecimal amountPaid;
    private BigDecimal amountDue;
    private BigDecimal balance;
    private String paymentMethod;
    private String referenceNumber;
    private String receiptUrl;
    private BigDecimal lateFee;
    private BigDecimal discount;
    private String notes;
    private LocalDateTime createdAt;
    private Long recordedBy;
    private String recordedByName;
}
