package com.propertymanagement.modules.inspection;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "unit_inspections")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnitInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "inspection_type", length = 20)
    private String inspectionType;

    @Column(name = "inspection_date", nullable = false)
    private LocalDate inspectionDate;

    @Column(name = "walls_condition")
    private Integer wallsCondition;

    @Column(name = "floors_condition")
    private Integer floorsCondition;

    @Column(name = "doors_condition")
    private Integer doorsCondition;

    @Column(name = "windows_condition")
    private Integer windowsCondition;

    @Column(name = "plumbing_condition")
    private Integer plumbingCondition;

    @Column(name = "electrical_condition")
    private Integer electricalCondition;

    @Column(name = "ac_condition")
    private Integer acCondition;

    @Column(name = "overall_condition", length = 20)
    private String overallCondition;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "damages_description", columnDefinition = "TEXT")
    private String damagesDescription;

    @Builder.Default
    @Column(name = "deductions_amount", precision = 10, scale = 2)
    private BigDecimal deductionsAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "tenant_confirmed")
    private boolean tenantConfirmed = false;

    @Column(name = "officer_id")
    private Long officerId;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
