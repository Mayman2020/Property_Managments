package com.propertymanagement.modules.hr.employee.dto;

import com.propertymanagement.modules.user.UserRole;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class EmployeeRequest {
    private Long propertyId;

    @NotBlank
    private String fullName;
    private String phone;
    private String email;
    private String nationalId;
    private String profileImageUrl;
    private String civilIdImageUrl;
    private String jobTitleAr;
    private String jobTitleEn;
    @NotNull
    private LocalDate hireDate;
    @NotNull
    @DecimalMin("1.00")
    private BigDecimal basicSalary;

    /** Optional: system role for portal access (ACCOUNTANT, HR_OFFICER, CONTRACTS_OFFICER, MAINTENANCE_OFFICER, PROPERTY_ADMIN) */
    private UserRole systemRole;
}
