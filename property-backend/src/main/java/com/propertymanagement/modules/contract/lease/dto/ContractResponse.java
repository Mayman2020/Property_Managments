package com.propertymanagement.modules.contract.lease.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class ContractResponse {
    private Long id;
    private String contractNumber;
    private Long tenantId;
    private String tenantName;
    private Long unitId;
    private String unitNumber;
    private Long propertyId;
    private String propertyName;
    private Long ownerId;
    private String ownerName;
    private Long templateId;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate signingDate;
    private BigDecimal monthlyRent;
    private BigDecimal annualRent;
    private BigDecimal securityDeposit;
    private String paymentFrequency;
    private Integer paymentDay;
    private String currency;
    private String status;
    private boolean autoRenewable;
    private Integer renewalNoticeDays;
    private String contractPdfUrl;
    private String signedPdfUrl;
    private LocalDate terminationDate;
    private String terminationReason;
    private Long terminatedBy;
    private String terminatedByName;
    private Boolean terminationDepositReturn;
    private Boolean terminationHasDamages;
    private BigDecimal terminationDamagesAmount;
    private Boolean terminationDamagesTenantPaid;
    /** Staff user that submitted the termination request (PENDING_TERMINATION_APPROVAL). */
    private Long terminationRequestedBy;
    private String terminationRequestedByName;
    private LocalDateTime terminationRequestedAt;
    private String terminationRequestNotes;
    /** Owner / admin user that approved or rejected the termination request. */
    private Long terminationDecisionBy;
    private String terminationDecisionByName;
    private LocalDateTime terminationDecisionAt;
    private String terminationDecisionNotes;
    private Long renewalRequestedBy;
    private String renewalRequestedByName;
    private LocalDateTime renewalRequestedAt;
    private String renewalRequestedNote;
    private LocalDate renewalProposedStartDate;
    private LocalDate renewalProposedEndDate;
    private BigDecimal renewalProposedRentAmount;
    private Long renewalDecisionBy;
    private String renewalDecisionByName;
    private LocalDateTime renewalDecisionAt;
    private String renewalDecisionNote;
    private String renewalDecisionStatus;
    private Integer freeMonths;
    private Boolean hasFreeMonth;
    private String rentDiscountReason;
    private String otherReasonText;
    private String ownerApprovalStatus;
    private String ownerApprovalNotes;
    /** Owner amendments on draft (was → became + reason), newline-separated. */
    private String ownerChangeLog;
    /** Staff audit lines (timestamp | user | action | detail). */
    private String staffChangeLog;
    private String notes;
    private long daysUntilExpiry;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long approvedBy;
    private String approvedByName;
    private Long modifiedBy;
    private String modifiedByName;
}
