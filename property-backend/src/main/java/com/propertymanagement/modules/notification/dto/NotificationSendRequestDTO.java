package com.propertymanagement.modules.notification.dto;

import com.propertymanagement.modules.notification.entity.NotificationChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class NotificationSendRequestDTO {
    @NotNull
    private Long recipientUserId;
    private String recipientType;
    @NotBlank
    private String title;
    @NotBlank
    private String body;
    private NotificationChannelType channel;
    private String relatedEntity;
    private Long relatedId;
    private Map<String, Object> variables;
}
