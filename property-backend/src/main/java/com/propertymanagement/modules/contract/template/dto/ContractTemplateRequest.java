package com.propertymanagement.modules.contract.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContractTemplateRequest {

    @NotBlank
    @Size(max = 200)
    private String templateName;

    private String templateType;

    @NotBlank
    private String content;

    private String variables;

    private Boolean isActive = true;
}
