package com.propertymanagement.modules.complaint.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_ratings")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplaintRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false, unique = true)
    private Long complaintId;

    @Column(name = "rater_user_id")
    private Long raterUserId;

    /** VERY_SATISFIED | SATISFIED | DISSATISFIED | VERY_DISSATISFIED */
    @Column(length = 30)
    private String rating;

    @Column(name = "rater_role", length = 50)
    private String raterRole;

    @CreatedDate
    @Column(name = "rated_at", updatable = false)
    private LocalDateTime ratedAt;
}
