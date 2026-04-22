package com.propertymanagement.modules.maintenance.rating;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RatingsSummaryResponse {
    private double averageRating;
    private long totalRatings;
    private long oneStar;
    private long twoStar;
    private long threeStar;
    private long fourStar;
    private long fiveStar;
}
