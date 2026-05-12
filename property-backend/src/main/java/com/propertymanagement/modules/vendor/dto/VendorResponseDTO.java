package com.propertymanagement.modules.vendor.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class VendorResponseDTO {
    private Long id;
    private Long propertyId;
    private String vendorCode;
    private String vendorName;
    private String vendorNameAr;
    private String vendorNameEn;
    private String vendorType;
    private String contactPerson;
    private String phone;
    private String email;
    private BigDecimal rating;
    private Integer totalJobs;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
