package com.propertymanagement.modules.owner.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class OwnerResponse {
    private Long id;
    private String fullName;
    private String nationalId;
    private String phone;
    private String email;
    private String address;
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
