package com.propertymanagement.modules.contract.annex.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class ContractAnnexResponse {
    private Long id;
    private Long contractId;
    private String annexNumber;
    private String title;
    private String description;
    private LocalDate effectiveDate;
    private String documentUrl;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
