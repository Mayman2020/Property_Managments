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
    private Integer freeMonths;
    private Boolean hasFreeMonth;
    private String rentDiscountReason;
    private String otherReasonText;
    private String ownerApprovalStatus;
    private String ownerApprovalNotes;
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
