package com.propertymanagement.modules.maintenance.contractinvoice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_contract_invoices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceContractInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "contractor_company_id", nullable = false)
    private Long contractorCompanyId;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "invoice_month", nullable = false)
    private Integer invoiceMonth;

    @Column(name = "invoice_year", nullable = false)
    private Integer invoiceYear;

    @Column(name = "amount", nullable = false, precision = 15, scale = 3)
    private BigDecimal amount;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT | ISSUED | PAID | OVERDUE | CANCELLED

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
