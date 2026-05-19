package com.propertymanagement.modules.maintenance.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MaintenanceContractDecisionRequest {
    @NotBlank
    private String decision;
    private String notes;
    private BigDecimal settlementAmount;
}
