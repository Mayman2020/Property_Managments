package com.propertymanagement.modules.vacancy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class RentalInquiryResponseDTO {
    private Long id;
    private String inquirerName;
    private String inquirerPhone;
    private String inquirerEmail;
    private String status;
    private LocalDate preferredStart;
}
