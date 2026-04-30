package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TerminateContractDto {

    @NotNull
    private LocalDate terminationDate;

    private String terminationReason;
}
