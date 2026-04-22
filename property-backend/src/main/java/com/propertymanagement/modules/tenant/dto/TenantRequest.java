package com.propertymanagement.modules.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TenantRequest {
    @NotBlank
    private String fullName;
    @NotNull
    private Long unitId;
    private Long userId;
    private String nationalId;
    @NotBlank
    private String phone;
    private String email;
    private LocalDate leaseStart;
    private LocalDate leaseEnd;
    private String profileImage;
    private String notes;
}
