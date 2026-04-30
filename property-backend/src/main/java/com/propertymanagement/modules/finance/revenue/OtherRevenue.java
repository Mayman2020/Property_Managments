package com.propertymanagement.modules.finance.revenue;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "other_revenues")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtherRevenue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "revenue_number")
    private String revenueNumber;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "category_id")
    private Long categoryId;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(precision = 14, scale = 2)
    private BigDecimal amount;
    private String currency;
    @Column(name = "revenue_date")
    private LocalDate revenueDate;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
