package com.propertymanagement.modules.hr.payroll.dto;

import com.propertymanagement.modules.hr.payroll.entity.PayrollDeductionStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class PayrollDeductionResponse {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private BigDecimal amount;
    private String reason;
    private LocalDate deductionDate;
    private String payrollMonth;
    private PayrollDeductionStatus status;
    private String reviewNote;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
