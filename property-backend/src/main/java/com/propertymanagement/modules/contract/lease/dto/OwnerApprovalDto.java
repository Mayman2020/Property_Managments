package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OwnerApprovalDto {
    @NotBlank
    private String decision; // APPROVED or REJECTED
    private String notes;
}
