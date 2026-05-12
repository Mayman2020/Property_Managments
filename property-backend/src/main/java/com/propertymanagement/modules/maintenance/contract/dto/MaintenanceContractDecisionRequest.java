package com.propertymanagement.modules.maintenance.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MaintenanceContractDecisionRequest {
    @NotBlank
    private String decision;
    private String notes;
}
