package com.propertymanagement.modules.contract.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rent_payment_schedule")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RentPaymentSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private PaymentScheduleStatus status = PaymentScheduleStatus.PENDING;

    @Column(name = "proof_url", length = 500)
    private String proofUrl;

    @Column(name = "proof_urls", columnDefinition = "TEXT")
    private String proofUrls;

    @Column(name = "proof_payment_date")
    private LocalDate proofPaymentDate;

    @Column(name = "proof_notes", columnDefinition = "TEXT")
    private String proofNotes;

    @Column(name = "proof_payment_method", length = 30)
    private String proofPaymentMethod;

    @Column(name = "proof_reference_number", length = 100)
    private String proofReferenceNumber;

    @Column(name = "proof_submitted_by")
    private Long proofSubmittedBy;

    @Column(name = "proof_submitted_at")
    private LocalDateTime proofSubmittedAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Builder.Default
    @Column(name = "late_fee_applied")
    private boolean lateFeeApplied = false;

    @Column(name = "overdue_reminder_sent_at")
    private LocalDateTime overdueReminderSentAt;

    @Column(name = "overdue_reminder_snoozed_until")
    private LocalDateTime overdueReminderSnoozedUntil;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
