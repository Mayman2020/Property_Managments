package com.propertymanagement.modules.ownerportal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.unit.entity.Unit;

@Data
public class OwnerAmendDraftRequest {
    /** When set, must differ from current unit and belong to a property this owner may use. */
    private Long unitId;
    private BigDecimal monthlyRent;

    @NotBlank
    private String reason;
}
