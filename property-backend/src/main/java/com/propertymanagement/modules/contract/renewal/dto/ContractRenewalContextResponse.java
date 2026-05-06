package com.propertymanagement.modules.contract.renewal.dto;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.unit.dto.UnitResponse;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class ContractRenewalContextResponse {
    private ContractResponse contract;
    private UnitResponse unit;
    /** First contract in the renewal chain (original lease). */
    private LocalDate rootContractStartDate;
    /** End date of the contract being renewed (latest period before this renewal). */
    private LocalDate currentContractEndDate;
    /** How many times this lease was renewed before (edges from root → current). */
    private int priorRenewalCount;
    /** Ordered from root (oldest) to current (contract being renewed). */
    private List<RenewalChainContractDto> renewalChain;
    /** Current contract: months free in this period. */
    private Integer currentContractFreeMonths;
    private Boolean currentContractHasFreeMonth;
    /** Open maintenance requests on this unit (not completed/cancelled). */
    private long openMaintenanceRequestCount;
    /** Subset with a scheduled visit or in progress (needs coordination). */
    private long scheduledOrActiveMaintenanceCount;
    private List<MaintenanceRenewalSnippetDto> openMaintenanceSamples;
}
