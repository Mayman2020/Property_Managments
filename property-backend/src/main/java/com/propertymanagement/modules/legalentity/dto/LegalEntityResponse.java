package com.propertymanagement.modules.legalentity.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class LegalEntityResponse {
    private Long id;
    private String nameAr;
    private String nameEn;
    private String commercialRegistration;
    private String taxNumber;
    private String address;
    private String phone;
    private String email;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
