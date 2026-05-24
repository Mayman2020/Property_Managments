package com.propertymanagement.modules.vacancy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateInquiryRequest {
    @NotBlank
    private String inquirerName;
    @NotBlank
    private String inquirerPhone;
    private String inquirerEmail;
    private String inquirerType;
    private String message;
    private LocalDate preferredStart;
}
