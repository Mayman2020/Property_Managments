package com.propertymanagement.modules.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ComplaintRatingRequest {
    /** VERY_SATISFIED | SATISFIED | DISSATISFIED | VERY_DISSATISFIED */
    @NotBlank
    private String rating;
}
