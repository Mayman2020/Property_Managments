package com.propertymanagement.modules.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private UserDto user;

    @Data
    @Builder
    public static class UserDto {
        private Long id;
        private String email;
        private String username;
        private String fullName;
        private String profileImageUrl;
        private String bio;
        private String role;
        private Long propertyId;
        private String maintenanceOfficerType;
        private String maintenanceCompanyName;
        /** Populated for TENANT role when the user account is linked to a tenants row. */
        private Long tenantId;
        private Map<String, Map<String, Boolean>> permissions;
    }
}
