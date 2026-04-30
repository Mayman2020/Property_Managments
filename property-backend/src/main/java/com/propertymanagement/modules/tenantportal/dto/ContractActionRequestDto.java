package com.propertymanagement.modules.tenantportal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ContractActionRequestDto {

    @NotNull
    private Long contractId;

    @NotBlank
    private String actionType; // RENEWAL or TERMINATION

    private LocalDate requestedDate;

    private String reason;

    private String notes;

    private String attachmentUrl;
}
