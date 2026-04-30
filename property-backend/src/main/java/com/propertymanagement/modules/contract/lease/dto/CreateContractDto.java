package com.propertymanagement.modules.contract.lease.dto;

import com.propertymanagement.modules.contract.lease.PaymentFrequency;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateContractDto {

    @NotNull
    private Long tenantId;

    @NotNull
    private Long unitId;

    @NotNull
    private Long propertyId;

    private Long ownerId;
    private Long templateId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private LocalDate signingDate;

    @NotNull
    private BigDecimal monthlyRent;

    private BigDecimal securityDeposit;

    private PaymentFrequency paymentFrequency;

    @Min(1)
    private Integer paymentDay;

    private String currency;
    private Boolean autoRenewable;
    private Integer renewalNoticeDays;
    private String notes;
}
