package com.propertymanagement.modules.vacancy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental_inquiries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalInquiryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "listing_id")
    private Long listingId;
    @Column(name = "unit_id")
    private Long unitId;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "inquirer_name")
    private String inquirerName;
    @Column(name = "inquirer_phone")
    private String inquirerPhone;
    @Column(name = "inquirer_email")
    private String inquirerEmail;
    @Column(name = "inquirer_type")
    private String inquirerType;
    @Column(columnDefinition = "TEXT")
    private String message;
    @Column(name = "preferred_start")
    private LocalDate preferredStart;
    private String status;
    @Column(name = "assigned_to")
    private Long assignedTo;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
