package com.propertymanagement.modules.user.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mirrors editable owner registry fields for profile / user management sync. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerProfileLinkDto {
    @Size(max = 150)
    private String fullNameAr;
    @Size(max = 150)
    private String fullNameEn;
    @Size(max = 30)
    private String nationalId;
    @Size(max = 2000)
    private String address;
    @Size(max = 2000)
    private String notes;
}
