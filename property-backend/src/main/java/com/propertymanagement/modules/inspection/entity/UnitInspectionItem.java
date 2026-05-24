package com.propertymanagement.modules.inspection.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "unit_inspection_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnitInspectionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inspection_id", nullable = false)
    private Long inspectionId;

    @Column(nullable = false, length = 100)
    private String area;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ItemCondition condition;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "estimated_deduction", precision = 12, scale = 2)
    private BigDecimal estimatedDeduction;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
