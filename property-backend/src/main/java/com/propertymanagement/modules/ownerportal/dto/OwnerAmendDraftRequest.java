package com.propertymanagement.modules.ownerportal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OwnerAmendDraftRequest {
    /** When set, must differ from current unit and belong to a property this owner may use. */
    private Long unitId;
    private BigDecimal monthlyRent;

    @NotBlank
    private String reason;
}
