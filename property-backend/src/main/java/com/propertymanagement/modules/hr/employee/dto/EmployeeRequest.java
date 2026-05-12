package com.propertymanagement.modules.hr.employee.dto;

import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.propertymanagement.modules.hr.employee.entity.Employee;

@Getter
@Setter
public class EmployeeRequest {
    private Long propertyId;

    @NotBlank
    private String fullName;
    private String fullNameAr;
    private String fullNameEn;
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

    /** Optional: portal role for this employee (ACCOUNTANT, GENERAL_MANAGER, MAINTENANCE_*, PROPERTY_GUARD, PROCEDURES_CLERK). */
    private UserRole systemRole;

    /** True when the employee is affiliated with a contracted maintenance company. */
    private Boolean contractorAffiliated;
    /** Required when contractorAffiliated=true for maintenance users. */
    private Long contractorCompanyId;
    /** Optional explicit type; if omitted it is derived from contractorAffiliated. */
    private MaintenanceOfficerType maintenanceOfficerType;
}
