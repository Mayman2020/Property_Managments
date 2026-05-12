package com.propertymanagement.modules.contract.renewal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_renewals")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContractRenewal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_contract_id")
    private Long originalContractId;

    @Column(name = "new_contract_id")
    private Long newContractId;

    @Column(name = "renewal_date", nullable = false)
    private LocalDate renewalDate;

    @Column(name = "new_start_date", nullable = false)
    private LocalDate newStartDate;

    @Column(name = "new_end_date", nullable = false)
    private LocalDate newEndDate;

    @Column(name = "old_monthly_rent", precision = 12, scale = 2)
    private BigDecimal oldMonthlyRent;

    @Column(name = "new_monthly_rent", precision = 12, scale = 2)
    private BigDecimal newMonthlyRent;

    @Column(name = "rent_increase_pct", precision = 5, scale = 2)
    private BigDecimal rentIncreasePct;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "free_months")
    private Integer freeMonths = 0;

    @Column(name = "renewed_by")
    private Long renewedBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
