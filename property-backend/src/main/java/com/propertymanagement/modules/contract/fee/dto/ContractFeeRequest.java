package com.propertymanagement.modules.contract.fee.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ContractFeeRequest {

    @NotNull
    private Long contractId;

    private String feeType;
    private String description;

    @NotNull
    @Positive
    private BigDecimal amount;

    private LocalDate dueDate;
    private Boolean paid;
    private LocalDate paidDate;
    private String receiptUrl;
    private String notes;
}
