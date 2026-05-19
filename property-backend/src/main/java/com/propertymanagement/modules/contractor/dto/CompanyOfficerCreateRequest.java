package com.propertymanagement.modules.contractor.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CompanyOfficerCreateRequest {

    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String fullNameAr;
    private String fullNameEn;
    private String phone;
    private String profileImageUrl;
    private String civilIdImageUrl;
    private Long propertyId;
}
