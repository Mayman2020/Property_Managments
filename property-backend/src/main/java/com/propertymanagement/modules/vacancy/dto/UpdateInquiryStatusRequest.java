package com.propertymanagement.modules.vacancy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateInquiryStatusRequest {
    @NotBlank
    private String status;
}
