package com.propertymanagement.modules.contract.renewal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class MaintenanceRenewalSnippetDto {
    private Long id;
    private String requestNumber;
    private String title;
    private String status;
    private LocalDate scheduledDate;
}
