package com.propertymanagement.modules.notification.dto;

import com.propertymanagement.modules.notification.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private Long propertyId;
    private Long requestId;
    private boolean read;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}
