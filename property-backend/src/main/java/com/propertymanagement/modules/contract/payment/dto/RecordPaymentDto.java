package com.propertymanagement.modules.contract.payment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RecordPaymentDto {

    @NotNull
    private Long contractId;

    private Long scheduleId;
    private Long tenantId;

    @NotNull
    private LocalDate paymentDate;

    @NotNull
    @Positive
    private BigDecimal amountPaid;

    @NotNull
    @Positive
    private BigDecimal amountDue;

    private String paymentMethod;
    private String receiptUrl;
    private BigDecimal lateFee;
    private BigDecimal discount;
    private String notes;
}
