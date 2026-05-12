package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.propertymanagement.modules.tenant.entity.Tenant;

@Data
public class TerminateContractDto {

    @NotNull
    private LocalDate terminationDate;

    @NotBlank
    private String terminationReason;

    /** true = deposit will be returned to tenant; false = not returned / withheld per policy */
    @NotNull
    private Boolean securityDepositReturnToTenant;

    @NotNull
    private Boolean hasDamages;

    /** Required when {@link #hasDamages} is true */
    private BigDecimal damagesAmount;

    /** Whether the tenant has settled the damages (meaningful when {@link #hasDamages} is true) */
    @NotNull
    private Boolean damagesPaidByTenant;

    @AssertTrue(message = "Damages amount is required when damages are reported")
    public boolean isDamagesAmountValid() {
        if (!Boolean.TRUE.equals(getHasDamages())) {
            return true;
        }
        return damagesAmount != null && damagesAmount.compareTo(BigDecimal.ZERO) >= 0;
    }
}
