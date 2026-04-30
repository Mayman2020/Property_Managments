package com.propertymanagement.modules.contractor.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
    private LocalDate contractStart;
    private LocalDate contractEnd;
    private List<String> attachmentFiles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
