package com.propertymanagement.modules.vacancy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class VacancyListingResponseDTO {
    private Long id;
    private String titleAr;
    private String titleEn;
    private String propertyName;
    private String unitNumber;
    private BigDecimal askingRent;
    private LocalDate availableFrom;
    private Boolean isPublished;
    private Integer viewsCount;
}
