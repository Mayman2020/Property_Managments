package com.propertymanagement.modules.owner.dto;

import lombok.Data;

@Data
public class LinkUserRequest {
    private Long userId;
    private boolean portalAccess;
}
