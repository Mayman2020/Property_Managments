package com.propertymanagement.modules.contractor.dto;

public record CompanyOfficerResponse(
        Long id,
        String fullName,
        String fullNameAr,
        String fullNameEn,
        String email,
        String phone,
        boolean active,
        String profileImageUrl,
        String civilIdImageUrl,
        Long propertyId,
        String propertyName,
        String propertyNameAr,
        String propertyNameEn
) {}
