package com.propertymanagement.modules.maintenance.invoice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewInvoiceDto {
    @NotBlank
    private String status; // APPROVED or REJECTED
    private String notes;
}
