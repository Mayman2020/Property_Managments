package com.propertymanagement.modules.contractor.dto;

public record CompanyStaffPropertyResponse(
        Long propertyId,
        String propertyName,
        String propertyNameAr,
        String propertyNameEn,
        String contractNumber
) {}
