package com.propertymanagement.modules.property.attachment;

import java.time.LocalDateTime;

public record PropertyAttachmentResponse(
        Long id,
        Long propertyId,
        String originalName,
        String storedName,
        Long fileSize,
        String mimeType,
        Long uploadedBy,
        LocalDateTime createdAt
) {}
