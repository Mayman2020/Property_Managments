package com.propertymanagement.modules.tenantportal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewReceiptDto {
    @NotBlank
    private String status; // APPROVED or REJECTED
    private String notes;
}
