package com.propertymanagement.modules.user.dto;

import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.MaintenanceOfficerType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserRequest {
    @NotBlank
    private String username;
    @Email @NotBlank
    private String email;
    private String password;
    @NotBlank
    private String fullName;
    private String phone;
    private String profileImageUrl;
    private String bio;
    @NotNull
    private UserRole role;
    private Long propertyId;
    private MaintenanceOfficerType maintenanceOfficerType;
    private String maintenanceCompanyName;
}
