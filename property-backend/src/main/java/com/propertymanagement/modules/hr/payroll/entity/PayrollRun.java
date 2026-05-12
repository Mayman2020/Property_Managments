package com.propertymanagement.modules.hr.payroll.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payroll_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "pay_period_year")
    private Integer payPeriodYear;
    @Column(name = "pay_period_month")
    private Integer payPeriodMonth;
    @Column(name = "pay_date")
    private LocalDate payDate;
    private String status;
    @Column(name = "total_basic", precision = 14, scale = 2)
    private BigDecimal totalBasic;
    @Column(name = "total_allowances", precision = 14, scale = 2)
    private BigDecimal totalAllowances;
    @Column(name = "total_deductions", precision = 14, scale = 2)
    private BigDecimal totalDeductions;
    @Column(name = "total_bonuses", precision = 14, scale = 2)
    private BigDecimal totalBonuses;
    @Column(name = "total_net", precision = 14, scale = 2)
    private BigDecimal totalNet;
    private String notes;
    @Column(name = "prepared_by")
    private Long preparedBy;
    @Column(name = "approved_by")
    private Long approvedBy;
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (status == null || status.isBlank()) {
            status = "DRAFT";
        }
        if (totalBasic == null) totalBasic = BigDecimal.ZERO;
        if (totalAllowances == null) totalAllowances = BigDecimal.ZERO;
        if (totalDeductions == null) totalDeductions = BigDecimal.ZERO;
        if (totalBonuses == null) totalBonuses = BigDecimal.ZERO;
        if (totalNet == null) totalNet = BigDecimal.ZERO;
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
