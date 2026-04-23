package com.propertymanagement.modules.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TenantRequest {
    @NotBlank
    private String fullName;
    private Long unitId;
    private Long propertyId;
    private Long userId;
    private String nationalId;
    @NotBlank
    private String phone;
    private String email;
    @NotNull
    private LocalDate leaseStart;
    @NotNull
    private LocalDate leaseEnd;
    private String profileImage;
    @NotEmpty
    private List<String> leaseContractFiles;
    private String notes;
}
