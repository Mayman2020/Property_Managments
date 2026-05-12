package com.propertymanagement.modules.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;

@Data
public class UserProfileUpdateRequest {
    @Size(max = 150)
    private String fullName;
    @Size(max = 150)
    private String fullNameAr;
    @Size(max = 150)
    private String fullNameEn;
    @Size(max = 20)
    private String phone;
    @Size(max = 600)
    private String profileImageUrl;
    @Size(max = 2000)
    private String bio;

    /** Civil ID scan — stored on linked owner or employee row (not on {@code users}). */
    @Size(max = 600)
    private String civilIdImageUrl;

    /** Tenant lease attachments — stored on linked {@code tenants} row. */
    @Size(max = 30)
    private List<String> leaseContractFiles;

    @Valid
    private OwnerProfileLinkDto ownerLink;
    @Valid
    private TenantProfileLinkDto tenantLink;
    @Valid
    private EmployeeProfileLinkDto employeeLink;
}
