package com.propertymanagement.modules.ownerportal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "owner_statements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerStatement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "owner_id")
    private Long ownerId;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "statement_month")
    private Integer statementMonth;
    @Column(name = "statement_year")
    private Integer statementYear;
    @Column(name = "total_revenue", precision = 14, scale = 2)
    private BigDecimal totalRevenue;
    @Column(name = "total_expenses", precision = 14, scale = 2)
    private BigDecimal totalExpenses;
    @Column(name = "owner_net_amount", precision = 14, scale = 2)
    private BigDecimal ownerNetAmount;
    private String status;
    @Column(name = "pdf_url")
    private String pdfUrl;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
