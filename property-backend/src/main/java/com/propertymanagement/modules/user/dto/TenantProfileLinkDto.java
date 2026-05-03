package com.propertymanagement.modules.user.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantProfileLinkDto {
    @Size(max = 30)
    private String nationalId;
    private LocalDate leaseStart;
    private LocalDate leaseEnd;
    @Size(max = 2000)
    private String notes;
}
