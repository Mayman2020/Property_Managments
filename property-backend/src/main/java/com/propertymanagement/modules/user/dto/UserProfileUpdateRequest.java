package com.propertymanagement.modules.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

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
}
