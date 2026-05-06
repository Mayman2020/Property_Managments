package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OwnerRenewalDecisionDto {
    @NotBlank
    private String decision; // APPROVED | REJECTED

    private String notes;
}
