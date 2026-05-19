package com.propertymanagement.modules.contractor.dto;

public record AllCompanyOfficerResponse(
        Long id,
        String fullName,
        String fullNameAr,
        String fullNameEn,
        String email,
        String phone,
        boolean active,
        String profileImageUrl,
        Long propertyId,
        String propertyNameAr,
        String propertyNameEn,
        Long companyId,
        String companyNameAr,
        String companyNameEn
) {}
