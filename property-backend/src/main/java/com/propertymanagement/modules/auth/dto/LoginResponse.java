package com.propertymanagement.modules.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import com.propertymanagement.modules.user.entity.User;

@Data
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private UserDto user;

    @Data
    @Builder(toBuilder = true)
    public static class UserDto {
        private Long id;
        private String email;
        private String username;
        private String fullName;
        private String fullNameAr;
        private String fullNameEn;
        private String profileImageUrl;
        private String bio;
        private String role;
        /** Additional portal roles (enum names) merged with {@link #role}. */
        private List<String> extraRoles;
        private Long propertyId;
        private String maintenanceOfficerType;
        private String maintenanceCompanyName;
        private Long contractorCompanyId;
        /** Populated for TENANT role when the user account is linked to a tenants row. */
        private Long tenantId;
        /** Populated for OWNER role when the user account is linked to an owners row. */
        private Long ownerId;
        /** Owner / employee civil ID scan when not stored on the user row. */
        private String civilIdImageUrl;
        /** Tenant lease attachments. */
        private List<String> leaseContractFiles;
        private Map<String, Map<String, Boolean>> permissions;
        private Map<String, Boolean> clientModules;
        /** True when the user must change their temporary password before using the system. */
        private boolean mustChangePassword;
    }
}
