package com.propertymanagement.modules.notification.dto;

import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.notification.NotificationChannel;
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
    private String recipientType;
    private NotificationChannel channel;
    private Long propertyId;
    private Long requestId;
    private String relatedEntity;
    private Long relatedId;
    private boolean read;
    private boolean sent;
    private LocalDateTime readAt;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
}
