package com.propertymanagement.modules.user.dto;

import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.user.entity.User;

@Data
@Builder(toBuilder = true)
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String fullNameAr;
    private String fullNameEn;
    private String phone;
    private String profileImageUrl;
    /** From linked owner / employee when the user row has no civil ID image. */
    private String civilIdImageUrl;
    /** From linked tenant: lease contract attachment URLs. */
    private List<String> leaseContractFiles;
    private String bio;
    private UserRole role;
    /** Additional portal roles merged with {@link #role} for access control. */
    @Builder.Default
    private List<UserRole> extraRoles = new ArrayList<>();
    private Long propertyId;
    private MaintenanceOfficerType maintenanceOfficerType;
    private String maintenanceCompanyName;
    private Long contractorCompanyId;
    private boolean active;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;

    /** Populated for OWNER — registry fields editable from profile / user admin. */
    private OwnerProfileLinkDto ownerLink;
    /** Populated for TENANT. */
    private TenantProfileLinkDto tenantLink;
    /** Populated for staff roles linked to an employee row. */
    private EmployeeProfileLinkDto employeeLink;

    /** Active properties linked to this owner (primary owner_id and property_owners). */
    private List<OwnerPropertyBriefDto> ownerProperties;
}
