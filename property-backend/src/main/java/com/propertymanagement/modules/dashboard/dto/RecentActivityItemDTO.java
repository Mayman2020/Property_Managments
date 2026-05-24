package com.propertymanagement.modules.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentActivityItemDTO {
    private String id;
    private String category;
    private String title;
    private String description;
    private String actorName;
    private LocalDateTime occurredAt;
    private Long entityId;
    private Long propertyId;
    private String routePath;
    private String icon;
}
