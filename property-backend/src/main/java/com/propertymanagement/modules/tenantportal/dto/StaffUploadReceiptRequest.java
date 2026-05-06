package com.propertymanagement.modules.tenantportal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class StaffUploadReceiptRequest {
    @NotNull
    private Long tenantId;

    private Long contractId;

    @NotNull
    @Min(1)
    @Max(12)
    private Integer periodMonth;

    @NotNull
    @Min(2000)
    @Max(2100)
    private Integer periodYear;

    private BigDecimal amount;

    @NotBlank
    private String fileUrl;

    private String notes;
}
