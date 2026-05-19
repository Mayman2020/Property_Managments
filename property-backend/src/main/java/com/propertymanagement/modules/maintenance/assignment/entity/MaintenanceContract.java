package com.propertymanagement.modules.maintenance.assignment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_contracts")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(name = "contractor_company_id", nullable = false)
    private Long contractorCompanyId;

    @Column(name = "assignment_id")
    private Long assignmentId;

    @Column(name = "contract_number", length = 100)
    private String contractNumber;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "sla_hours")
    private Integer slaHours;

    @Column(name = "contract_value", precision = 15, scale = 3)
    private BigDecimal contractValue;

    @Column(name = "status", nullable = false, length = 40)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "previous_contract_id")
    private Long previousContractId;

    @Column(name = "owner_approval_status", length = 20)
    private String ownerApprovalStatus;

    @Column(name = "owner_approval_notes", columnDefinition = "TEXT")
    private String ownerApprovalNotes;

    @Column(name = "owner_approved_by")
    private Long ownerApprovedBy;

    @Column(name = "owner_approved_at")
    private LocalDateTime ownerApprovedAt;

    @Column(name = "termination_requested_by")
    private Long terminationRequestedBy;

    @Column(name = "termination_requested_at")
    private LocalDateTime terminationRequestedAt;

    @Column(name = "termination_request_notes", columnDefinition = "TEXT")
    private String terminationRequestNotes;

    @Column(name = "termination_proposed_date")
    private LocalDate terminationProposedDate;

    @Column(name = "termination_decision_by")
    private Long terminationDecisionBy;

    @Column(name = "termination_decision_at")
    private LocalDateTime terminationDecisionAt;

    @Column(name = "termination_decision_notes", columnDefinition = "TEXT")
    private String terminationDecisionNotes;

    @Column(name = "settlement_amount", precision = 15, scale = 3)
    private BigDecimal settlementAmount;

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

    @Column(name = "renewal_proposed_value", precision = 15, scale = 3)
    private BigDecimal renewalProposedValue;

    @Column(name = "renewal_decision_by")
    private Long renewalDecisionBy;

    @Column(name = "renewal_decision_at")
    private LocalDateTime renewalDecisionAt;

    @Column(name = "renewal_decision_note", columnDefinition = "TEXT")
    private String renewalDecisionNote;

    @Column(name = "renewal_decision_status", length = 20)
    private String renewalDecisionStatus;

    @Column(name = "staff_change_log", columnDefinition = "TEXT")
    private String staffChangeLog;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "attachment_urls", columnDefinition = "TEXT")
    private String attachmentUrls;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdByUserId;

    @LastModifiedBy
    @Column(name = "modified_by")
    private Long modifiedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
