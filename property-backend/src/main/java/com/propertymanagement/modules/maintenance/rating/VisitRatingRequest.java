package com.propertymanagement.modules.maintenance.rating;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VisitRatingRequest {
    @NotNull
    @Min(1) @Max(5)
    private Short rating;
    private String comment;
}
