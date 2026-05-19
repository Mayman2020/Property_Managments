package com.propertymanagement.modules.contract.lease.entity;

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
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.user.entity.User;

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
    @Column(name = "escalation_type", length = 20)
    private String escalationType = "NONE";

    @Builder.Default
    @Column(name = "escalation_rate", precision = 5, scale = 2)
    private java.math.BigDecimal escalationRate = java.math.BigDecimal.ZERO;

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

    /** Whether the security deposit is to be returned to the tenant. */
    @Column(name = "termination_deposit_return")
    private Boolean terminationDepositReturn;

    @Column(name = "termination_has_damages")
    private Boolean terminationHasDamages;

    @Column(name = "termination_damages_amount", precision = 12, scale = 2)
    private BigDecimal terminationDamagesAmount;

    /** Whether the tenant has paid the damages amount (recorded on handover). */
    @Column(name = "termination_damages_tenant_paid")
    private Boolean terminationDamagesTenantPaid;

    /** Staff user id that submitted the termination request (PENDING_TERMINATION_APPROVAL). */
    @Column(name = "termination_requested_by")
    private Long terminationRequestedBy;

    @Column(name = "termination_requested_at")
    private LocalDateTime terminationRequestedAt;

    @Column(name = "termination_request_notes", columnDefinition = "TEXT")
    private String terminationRequestNotes;

    /** Owner / admin user id that approved or rejected the termination request. */
    @Column(name = "termination_decision_by")
    private Long terminationDecisionBy;

    @Column(name = "termination_decision_at")
    private LocalDateTime terminationDecisionAt;

    @Column(name = "termination_decision_notes", columnDefinition = "TEXT")
    private String terminationDecisionNotes;

    /** Staff user id that submitted the renewal request (PENDING_RENEWAL_APPROVAL). */
    @Column(name = "renewal_requested_by")
    private Long renewalRequestedBy;

    @Column(name = "renewal_requested_at")
    private LocalDateTime renewalRequestedAt;

    @Column(name = "renewal_requested_note", columnDefinition = "TEXT")
    private String renewalRequestedNote;

    @Column(name = "renewal_proposed_start_date")
    private LocalDate renewalProposedStartDate;

    @Column(name = "renewal_proposed_end_date")
    private LocalDate renewalProposedEndDate;

    @Column(name = "renewal_proposed_rent_amount", precision = 12, scale = 2)
    private BigDecimal renewalProposedRentAmount;

    /** Owner/admin decision metadata for the pending renewal request. */
    @Column(name = "renewal_decision_by")
    private Long renewalDecisionBy;

    @Column(name = "renewal_decision_at")
    private LocalDateTime renewalDecisionAt;

    @Column(name = "renewal_decision_note", columnDefinition = "TEXT")
    private String renewalDecisionNote;

    @Column(name = "renewal_decision_status", length = 20)
    private String renewalDecisionStatus;

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

    @Builder.Default
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

    /** Owner-driven amendments on DRAFT before activation (human-readable lines). */
    @Column(name = "owner_change_log", columnDefinition = "TEXT")
    private String ownerChangeLog;

    /** Staff actions on contract (activate / cancel / draft edits), newline-separated. */
    @Column(name = "staff_change_log", columnDefinition = "TEXT")
    private String staffChangeLog;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** When the tenant expressed they do not want to renew. */
    @Column(name = "no_renewal_intent_at")
    private LocalDateTime noRenewalIntentAt;

    @Column(name = "no_renewal_intent_by")
    private Long noRenewalIntentBy;

    /** True once the security deposit has been recorded as income on activation. */
    @Builder.Default
    @Column(name = "deposit_income_recorded")
    private Boolean depositIncomeRecorded = false;

    /** True once the deposit-return expense entry has been created. */
    @Builder.Default
    @Column(name = "deposit_expense_recorded")
    private Boolean depositExpenseRecorded = false;

    /** Receipt URL uploaded by the tenant for the damage payment. */
    @Column(name = "termination_damages_receipt_url", columnDefinition = "TEXT")
    private String terminationDamagesReceiptUrl;

    /** Damage description written by the accountant. */
    @Column(name = "termination_damage_notes", columnDefinition = "TEXT")
    private String terminationDamageNotes;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
