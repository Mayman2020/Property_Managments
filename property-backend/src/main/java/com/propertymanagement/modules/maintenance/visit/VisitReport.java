package com.propertymanagement.modules.maintenance.visit;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "visit_reports")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VisitReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false)
    private Long requestId;

    @Column(name = "officer_id", nullable = false)
    private Long officerId;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(name = "visit_outcome", nullable = false, length = 30)
    private String visitOutcome;

    @Column(name = "work_done", columnDefinition = "TEXT")
    private String workDone;

    @Column(name = "officer_notes", columnDefinition = "TEXT")
    private String officerNotes;

    @Builder.Default
    @Column(name = "has_purchase")
    private boolean hasPurchase = false;

    @Column(name = "receipt_url", length = 500)
    private String receiptUrl;

    @Column(name = "purchase_amount", precision = 10, scale = 2)
    private BigDecimal purchaseAmount;

    @Column(name = "purchase_notes", columnDefinition = "TEXT")
    private String purchaseNotes;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @CreatedDate
    @Column(name = "created_on", updatable = false)
    private LocalDateTime createdOn;

    @LastModifiedBy
    @Column(name = "modified_by")
    private Long modifiedBy;

    @LastModifiedDate
    @Column(name = "modified_on")
    private LocalDateTime modifiedOn;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
