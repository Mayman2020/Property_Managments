package com.propertymanagement.modules.lookup.dto;

import com.propertymanagement.modules.lookup.LookupType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateClassificationRequest {

    @NotNull
    private LookupType type;

    @Size(max = 50)
    private String code;

    @NotBlank
    @Size(max = 150)
    private String nameAr;

    @NotBlank
    @Size(max = 150)
    private String nameEn;

    private Integer sortOrder = 0;
}
