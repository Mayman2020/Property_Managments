package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;

/**
 * Owner-portal payload for approving or rejecting a pending termination request.
 * {@code decision} is APPROVED or REJECTED; {@code notes} are surfaced in the
 * accountant + tenant decision notifications and persisted on the contract.
 */
@Data
public class OwnerTerminationDecisionDto {
    @NotBlank
    private String decision;

    private String notes;
}
