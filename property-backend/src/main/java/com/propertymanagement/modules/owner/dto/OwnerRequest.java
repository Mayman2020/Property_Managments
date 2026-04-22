package com.propertymanagement.modules.owner.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OwnerRequest {
    @NotBlank
    private String fullName;
    private String nationalId;
    private String phone;
    private String email;
    private String address;
    private String notes;
}
