package com.propertymanagement.modules.violation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ViolationRequest {
    private Long contractId;
    @NotNull private Long tenantId;
    private Long unitId;
    private String violationType;
    @NotBlank private String description;
    private String severity;
    private BigDecimal fineAmount;
    private String evidenceUrl;
    private String notes;
}
