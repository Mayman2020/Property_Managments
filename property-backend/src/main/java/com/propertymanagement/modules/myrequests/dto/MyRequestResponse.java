package com.propertymanagement.modules.myrequests.dto;

import java.time.LocalDateTime;

public record MyRequestResponse(
        String sourceType,
        Long sourceId,
        String referenceNumber,
        String title,
        String subject,
        String status,
        String progress,
        LocalDateTime requestedAt,
        String targetType,
        Long targetId,
        String targetLabel,
        String notes,
        String route
) {}
