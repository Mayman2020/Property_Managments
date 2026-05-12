package com.propertymanagement.modules.vendor.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VendorRequestDTO {
    private Long propertyId;

    private String vendorName;
    private String vendorNameAr;
    private String vendorNameEn;
    private String vendorType;
    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private String notes;
}
