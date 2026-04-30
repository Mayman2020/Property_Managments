package com.propertymanagement.modules.violation;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tenant_violations")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TenantViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "property_id")
    private Long propertyId;

    @Column(name = "violation_type", length = 50)
    private String violationType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    private String severity;

    @Builder.Default
    @Column(length = 30)
    private String status = "OPEN";

    @Builder.Default
    @Column(name = "fine_amount", precision = 10, scale = 2)
    private BigDecimal fineAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "fine_paid")
    private boolean finePaid = false;

    @Column(name = "evidence_url", length = 500)
    private String evidenceUrl;

    @Column(name = "reported_by")
    private Long reportedBy;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
