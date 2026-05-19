package com.propertymanagement.modules.finance.expense.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "expense_number")
    private String expenseNumber;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "category_id")
    private Long categoryId;
    @Column(name = "vendor_id")
    private Long vendorId;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;
    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;
    @Column(precision = 14, scale = 2)
    private BigDecimal amount;
    private String currency;
    @Column(name = "expense_date")
    private LocalDate expenseDate;
    @Column(name = "payroll_run_id")
    private Long payrollRunId;
    private String status;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
