package com.propertymanagement.modules.user.dto;

import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.owner.entity.Owner;

@Data
public class UserRequest {
    private String username;
    @Email @NotBlank
    private String email;
    private String password;
    @NotBlank
    private String fullName;
    private String fullNameAr;
    private String fullNameEn;
    private String phone;
    private String profileImageUrl;
    /** Civil ID scan — synced to linked owner / employee when applicable. */
    private String civilIdImageUrl;
    private String bio;
    @NotNull
    private UserRole role;
    private Long propertyId;
    private MaintenanceOfficerType maintenanceOfficerType;
    private String maintenanceCompanyName;
    /** Required when maintenanceOfficerType is CONTRACTOR_COMPANY — links officer to registry company. */
    private Long contractorCompanyId;

    @Valid
    private OwnerProfileLinkDto ownerLink;
    @Valid
    private TenantProfileLinkDto tenantLink;
    @Valid
    private EmployeeProfileLinkDto employeeLink;
}
