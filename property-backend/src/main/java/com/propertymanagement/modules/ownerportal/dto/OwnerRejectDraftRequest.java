package com.propertymanagement.modules.ownerportal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OwnerRejectDraftRequest {
    @NotBlank
    private String reason;
}
