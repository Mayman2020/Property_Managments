package com.propertymanagement.modules.owner.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class OwnerResponse {
    private Long id;
    /** Legacy combined line (e.g. AR / EN); prefer fullNameAr / fullNameEn for UI. */
    private String fullName;
    private String fullNameAr;
    private String fullNameEn;
    private String nationalId;
    private String phone;
    private String email;
    private String profileImageUrl;
    private String civilIdImageUrl;
    private String address;
    private String notes;
    private boolean active;
    private Long userId;
    /** True when a linked system user exists and that user account is active (can sign in). */
    private boolean linkedUserActive;
    private boolean portalAccess;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;
}
