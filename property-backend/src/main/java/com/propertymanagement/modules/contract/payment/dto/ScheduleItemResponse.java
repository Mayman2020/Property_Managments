package com.propertymanagement.modules.contract.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class ScheduleItemResponse {
    private Long id;
    private Long contractId;
    private String contractNumber;
    private Long tenantId;
    private String tenantName;
    private LocalDate dueDate;
    private BigDecimal amount;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String status;
    private long daysOverdue;
    private LocalDateTime createdAt;

    /** From latest rent_payment row for this schedule (settlement / receipt). */
    private String receiptUrl;
    private String settlementNotes;
    private LocalDate settlementPaymentDate;
    private String recordedByName;

    private String proofUrl;
    private List<String> proofUrls;
    private LocalDate proofPaymentDate;
    private String proofNotes;
    private String proofPaymentMethod;
    private String proofReferenceNumber;
    private Long proofSubmittedBy;
    private String proofSubmittedByName;
    private LocalDateTime proofSubmittedAt;
    private Long reviewedBy;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private String rejectionReason;
}
