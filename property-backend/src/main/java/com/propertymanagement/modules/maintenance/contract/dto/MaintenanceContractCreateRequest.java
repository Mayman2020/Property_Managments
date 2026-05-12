package com.propertymanagement.modules.maintenance.contract.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class MaintenanceContractCreateRequest {

    @NotNull
    private Long propertyId;

    @NotNull
    private Long contractorCompanyId;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;

    private BigDecimal contractValue;

    private String currency;

    private String notes;
}
