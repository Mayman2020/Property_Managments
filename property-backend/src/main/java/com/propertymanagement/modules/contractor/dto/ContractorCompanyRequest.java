package com.propertymanagement.modules.contractor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContractorCompanyRequest {
    @NotBlank
    @Size(max = 200)
    private String name;

    @Size(max = 40)
    private String phone;

    @Size(max = 150)
    private String email;

    private String notes;

    private Boolean active;
}
