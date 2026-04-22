package com.propertymanagement.modules.maintenance.rating;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class VisitRatingResponse {
    private Long id;
    private Long requestId;
    private Short rating;
    private String comment;
    private LocalDateTime createdAt;
}
