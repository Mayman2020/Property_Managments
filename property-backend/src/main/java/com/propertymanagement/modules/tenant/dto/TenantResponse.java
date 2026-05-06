package com.propertymanagement.modules.tenant.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TenantResponse {
    private Long id;
    private Long userId;
    /** True when a linked system user exists and that user account is active (can sign in). */
    private boolean linkedUserActive;
    private Long unitId;
    private Long propertyId;
    private String fullName;
    private String fullNameAr;
    private String fullNameEn;
    private String nationalId;
    private String phone;
    private String email;
    private LocalDate leaseStart;
    private LocalDate leaseEnd;
    private String profileImage;
    private String civilIdImageUrl;
    private List<String> leaseContractFiles;
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;
}
