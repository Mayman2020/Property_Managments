package com.propertymanagement.modules.inspection.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "unit_inspections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnitInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "unit_id", nullable = false)
    private Long unitId;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Enumerated(EnumType.STRING)
    @Column(name = "inspection_type", nullable = false, length = 20)
    private InspectionType inspectionType;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InspectionStatus status = InspectionStatus.PENDING;

    @Column(name = "inspector_id")
    private Long inspectorId;

    @Column(name = "tenant_signed_at")
    private LocalDateTime tenantSignedAt;

    @Column(name = "inspector_signed_at")
    private LocalDateTime inspectorSignedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "total_deduction", precision = 12, scale = 2)
    private BigDecimal totalDeduction;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
