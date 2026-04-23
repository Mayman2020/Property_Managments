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
    private Long unitId;
    private Long propertyId;
    private String fullName;
    private String nationalId;
    private String phone;
    private String email;
    private LocalDate leaseStart;
    private LocalDate leaseEnd;
    private String profileImage;
    private List<String> leaseContractFiles;
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
