package com.propertymanagement.modules.maintenance.invoice.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SubmitInvoiceDto {

    @NotNull
    @Min(1) @Max(12)
    private Integer periodMonth;

    @NotNull
    @Min(2020)
    private Integer periodYear;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    private Long propertyId;
    private Long unitId;
    private String description;
    private String fileUrl;
    private String notes;
}
