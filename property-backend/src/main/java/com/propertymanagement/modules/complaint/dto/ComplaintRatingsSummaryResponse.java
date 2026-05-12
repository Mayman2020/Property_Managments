package com.propertymanagement.modules.complaint.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ComplaintRatingsSummaryResponse {
    private double averageRating;
    private long totalRatings;
    private long veryDissatisfied;
    private long dissatisfied;
    private long satisfied;
    private long verySatisfied;
}
