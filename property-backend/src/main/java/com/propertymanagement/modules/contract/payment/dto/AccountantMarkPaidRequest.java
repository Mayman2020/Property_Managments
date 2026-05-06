package com.propertymanagement.modules.contract.payment.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class AccountantMarkPaidRequest {
    private BigDecimal amountPaid;
    private LocalDate paymentDate;
    private String paymentMethod;
    private String referenceNumber;
    private String receiptUrl;
    private String notes;
}
