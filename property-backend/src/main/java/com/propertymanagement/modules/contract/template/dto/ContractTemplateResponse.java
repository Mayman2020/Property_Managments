package com.propertymanagement.modules.contract.template.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class ContractTemplateResponse {
    private Long id;
    private String templateName;
    private String templateNameAr;
    private String templateNameEn;
    private String templateType;
    private String content;
    private String variables;
    private boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
