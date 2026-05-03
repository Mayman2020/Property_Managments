package com.propertymanagement.modules.user.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeProfileLinkDto {
    @Size(max = 30)
    private String nationalId;
    @Size(max = 120)
    private String jobTitleAr;
    @Size(max = 120)
    private String jobTitleEn;
}
