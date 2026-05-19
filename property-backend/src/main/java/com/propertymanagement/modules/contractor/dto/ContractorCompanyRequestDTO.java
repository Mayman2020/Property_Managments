package com.propertymanagement.modules.contractor.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ContractorCompanyRequestDTO {
    @Size(max = 200)
    private String name;

    @Size(max = 200)
    private String nameAr;

    @Size(max = 200)
    private String nameEn;

    @Size(max = 40)
    private String phone;

    @Email
    @Size(max = 150)
    private String email;

    @Size(max = 500)
    private String profileImageUrl;

    @Size(max = 500)
    private String civilIdImageUrl;

    private String notes;

    private Boolean active;

    private LocalDate contractStart;

    private LocalDate contractEnd;

    private List<String> attachmentFiles;

    /**
     * Property context for the portal user created for a new maintenance company.
     */
    private Long portalPropertyId;
}
