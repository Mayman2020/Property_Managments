package com.propertymanagement.modules.vacancy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vacancy_listings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacancyListingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "unit_id")
    private Long unitId;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "title_ar")
    private String titleAr;
    @Column(name = "title_en")
    private String titleEn;
    @Column(name = "description_ar")
    private String descriptionAr;
    @Column(name = "asking_rent", precision = 12, scale = 2)
    private BigDecimal askingRent;
    @Column(length = 10)
    private String currency;
    @Column(name = "available_from")
    private LocalDate availableFrom;
    @Column(name = "is_published")
    private boolean published;
    @Column(name = "published_at")
    private LocalDateTime publishedAt;
    @Column(name = "views_count")
    private Integer viewsCount;
    @Column(name = "created_by")
    private Long createdBy;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
