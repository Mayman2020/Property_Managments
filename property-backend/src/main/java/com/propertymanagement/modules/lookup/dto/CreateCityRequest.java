package com.propertymanagement.modules.lookup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCityRequest {
    @NotBlank
    @Size(max = 50)
    private String code;

    @NotBlank
    @Size(max = 150)
    private String nameAr;

    @NotBlank
    @Size(max = 150)
    private String nameEn;

    @NotNull
    private Long countryId;

    private Integer sortOrder = 0;
}
