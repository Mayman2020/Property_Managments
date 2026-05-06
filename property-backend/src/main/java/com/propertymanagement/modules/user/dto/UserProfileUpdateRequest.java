package com.propertymanagement.modules.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class UserProfileUpdateRequest {
    @Size(max = 150)
    private String fullName;
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
