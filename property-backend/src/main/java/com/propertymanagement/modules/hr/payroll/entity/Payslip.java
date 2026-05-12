package com.propertymanagement.modules.hr.payroll.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payslips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payslip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payroll_run_id", nullable = false)
    private Long payrollRunId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "basic_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal basicSalary;

    @Builder.Default
    @Column(name = "housing_allowance", precision = 10, scale = 2)
    private BigDecimal housingAllowance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "transport_allowance", precision = 10, scale = 2)
    private BigDecimal transportAllowance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "other_allowances", precision = 10, scale = 2)
    private BigDecimal otherAllowances = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "overtime_amount", precision = 10, scale = 2)
    private BigDecimal overtimeAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "bonus_amount", precision = 10, scale = 2)
    private BigDecimal bonusAmount = BigDecimal.ZERO;

    @Column(name = "total_earnings", precision = 12, scale = 2)
    private BigDecimal totalEarnings;

    @Builder.Default
    @Column(name = "absence_deduction", precision = 10, scale = 2)
    private BigDecimal absenceDeduction = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "late_deduction", precision = 10, scale = 2)
    private BigDecimal lateDeduction = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "advance_deduction", precision = 10, scale = 2)
    private BigDecimal advanceDeduction = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "penalty_deduction", precision = 10, scale = 2)
    private BigDecimal penaltyDeduction = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "insurance_deduction", precision = 10, scale = 2)
    private BigDecimal insuranceDeduction = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "other_deductions", precision = 10, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 12, scale = 2)
    private BigDecimal totalDeductions;

    @Column(name = "net_salary", precision = 12, scale = 2)
    private BigDecimal netSalary;

    @Builder.Default
    @Column(name = "is_paid")
    private Boolean paid = false;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "reference_number")
    private String referenceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
