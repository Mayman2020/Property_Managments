package com.propertymanagement.modules.property.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OwnerShareDto {
    @NotNull
    private Long ownerId;

    @NotNull
    @DecimalMin("0.01")
    @DecimalMax("100")
    private BigDecimal ownershipPercentage;
}
