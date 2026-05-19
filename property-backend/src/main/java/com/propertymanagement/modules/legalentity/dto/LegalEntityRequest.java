package com.propertymanagement.modules.legalentity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LegalEntityRequest {
    @NotBlank
    private String nameAr;
    private String nameEn;
    private String commercialRegistration;
    private String taxNumber;
    private String address;
    private String phone;
    private String email;
    private Boolean active;
}
