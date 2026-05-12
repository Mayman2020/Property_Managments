package com.propertymanagement.modules.notification.dto;

import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.entity.NotificationChannelType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class NotificationResponseDTO {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private Long actorUserId;
    private String actorDisplayName;
    private String recipientType;
    private NotificationChannelType channel;
    private Long propertyId;
    private Long requestId;
    private String relatedEntity;
    private Long relatedId;
    private boolean read;
    private boolean sent;
    private LocalDateTime readAt;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
    /**
     * Structured i18n payload — present when the notification was created via the localized flow.
     * Shape: {@code {"titleKey": "...", "bodyKey": "...", "vars": {...}}}.
     */
    private Map<String, Object> params;
}
