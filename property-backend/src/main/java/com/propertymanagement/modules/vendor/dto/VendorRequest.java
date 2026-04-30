package com.propertymanagement.modules.vendor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VendorRequest {
    private Long propertyId;

    @NotBlank
    private String vendorName;
    private String vendorType;
    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private String notes;
}
