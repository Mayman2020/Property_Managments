package com.propertymanagement.modules.finance.revenue.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "revenue_categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RevenueCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_code", unique = true, nullable = false, length = 50)
    private String categoryCode;

    @Column(name = "category_name_ar", nullable = false, length = 200)
    private String categoryNameAr;

    @Column(name = "category_name_en", length = 200)
    private String categoryNameEn;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
}
