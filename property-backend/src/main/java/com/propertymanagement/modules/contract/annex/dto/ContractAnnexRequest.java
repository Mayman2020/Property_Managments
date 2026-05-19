package com.propertymanagement.modules.contract.annex.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ContractAnnexRequest {
    @NotBlank
    private String title;
    private String annexNumber;
    private String description;
    private LocalDate effectiveDate;
    private String documentUrl;
}
