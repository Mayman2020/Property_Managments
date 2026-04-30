package com.propertymanagement.modules.hr.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class PayrollPaidRequest {
    @NotNull
    private LocalDate paidDate;
    @NotBlank
    private String paymentMethod;
    private String referenceNumber;
}
