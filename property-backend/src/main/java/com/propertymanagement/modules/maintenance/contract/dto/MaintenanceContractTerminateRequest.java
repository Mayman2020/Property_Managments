package com.propertymanagement.modules.maintenance.contract.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MaintenanceContractTerminateRequest {
    @NotNull
    private LocalDate terminationDate;
    private String reason;
}
