package com.propertymanagement.modules.LookupEntity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateLookupRequestDTO {

    @NotBlank
    @Size(max = 50)
    private String code;

    @NotBlank
    @Size(max = 150)
    private String nameAr;

    @NotBlank
    @Size(max = 150)
    private String nameEn;

    private Integer sortOrder = 0;

    private boolean active = true;
}
