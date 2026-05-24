package com.propertymanagement.modules.vacancy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class CreateVacancyRequest {
    @NotNull
    private Long unitId;
    @NotNull
    private Long propertyId;
    private String titleAr;
    private String titleEn;
    private String descriptionAr;
    private BigDecimal askingRent;
    private String currency;
    private LocalDate availableFrom;
}
