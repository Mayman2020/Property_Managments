package com.propertymanagement.modules.contract.lease;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "lease_contracts")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaseContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_number", unique = true, nullable = false, length = 50)
    private String contractNumber;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "property_id")
    private Long propertyId;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "signing_date")
    private LocalDate signingDate;

    @Column(name = "monthly_rent", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyRent;

    @Column(name = "annual_rent", precision = 12, scale = 2, insertable = false, updatable = false)
    private BigDecimal annualRent;

    @Builder.Default
    @Column(name = "security_deposit", precision = 12, scale = 2)
    private BigDecimal securityDeposit = BigDecimal.ZERO;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_frequency", length = 20)
    private PaymentFrequency paymentFrequency = PaymentFrequency.MONTHLY;

    @Builder.Default
    @Column(name = "payment_day")
    private Integer paymentDay = 1;

    @Builder.Default
    @Column(name = "currency", length = 10)
    private String currency = "OMR";

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private ContractStatus status = ContractStatus.DRAFT;

    @Builder.Default
    @Column(name = "is_auto_renewable")
    private boolean autoRenewable = false;

    @Builder.Default
    @Column(name = "renewal_notice_days")
    private Integer renewalNoticeDays = 30;

    @Column(name = "contract_pdf_url", length = 500)
    private String contractPdfUrl;

    @Column(name = "signed_pdf_url", length = 500)
    private String signedPdfUrl;

    @Column(name = "termination_date")
    private LocalDate terminationDate;

    @Column(name = "termination_reason", columnDefinition = "TEXT")
    private String terminationReason;

    @Column(name = "terminated_by")
    private Long terminatedBy;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdByUserId;

    @Column(name = "approved_by")
    private Long approvedBy;

    @LastModifiedBy
    @Column(name = "modified_by")
    private Long modifiedBy;

    @Builder.Default
    @Column(name = "free_months")
    private Integer freeMonths = 0;

    @Column(name = "has_free_month", length = 1)
    private Boolean hasFreeMonth = false;

    @Column(name = "rent_discount_reason", length = 50)
    private String rentDiscountReason;

    @Column(name = "other_reason_text", columnDefinition = "TEXT")
    private String otherReasonText;

    @Column(name = "owner_approval_status", length = 20)
    private String ownerApprovalStatus;

    @Column(name = "owner_approved_at")
    private LocalDateTime ownerApprovedAt;

    @Column(name = "owner_approved_by")
    private Long ownerApprovedBy;

    @Column(name = "owner_approval_notes", columnDefinition = "TEXT")
    private String ownerApprovalNotes;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
