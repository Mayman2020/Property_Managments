package com.propertymanagement.modules.owner.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OwnerRequest {
    @NotBlank
    private String fullNameAr;
    @NotBlank
    private String fullNameEn;
    private String nationalId;
    private String phone;
    private String email;
    private String profileImageUrl;
    private String civilIdImageUrl;
    private String address;
    private String notes;
}
