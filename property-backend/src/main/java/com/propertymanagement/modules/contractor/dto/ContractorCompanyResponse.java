package com.propertymanagement.modules.contractor.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ContractorCompanyResponse {
    private Long id;
    private String name;
    private String nameAr;
    private String nameEn;
    private String phone;
    private String email;
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
