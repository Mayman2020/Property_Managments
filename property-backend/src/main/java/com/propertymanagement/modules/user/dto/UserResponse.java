package com.propertymanagement.modules.user.dto;

import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.MaintenanceOfficerType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String profileImageUrl;
    private String bio;
    private UserRole role;
    private Long propertyId;
    private MaintenanceOfficerType maintenanceOfficerType;
    private String maintenanceCompanyName;
    private boolean active;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
