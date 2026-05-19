package com.propertymanagement.modules.contractor.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ContractorCompanyResponseDTO {
    private Long id;
    private String name;
    private String nameAr;
    private String nameEn;
    private String phone;
    private String email;
    private String profileImageUrl;
    private String civilIdImageUrl;
    private String notes;
    private boolean active;
    private String latestMaintenanceContractStatus;
    private String latestMaintenanceContractOwnerApprovalStatus;
    private String latestMaintenanceContractNumber;
    private LocalDate contractStart;
    private LocalDate contractEnd;
    /** Start date from the latest maintenance contract (cross-property). */
    private LocalDate latestContractStart;
    /** End date from the latest maintenance contract (cross-property). */
    private LocalDate latestContractEnd;
    private BigDecimal latestContractValue;
    private int propertiesCount;
    private List<String> attachmentFiles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;
}
