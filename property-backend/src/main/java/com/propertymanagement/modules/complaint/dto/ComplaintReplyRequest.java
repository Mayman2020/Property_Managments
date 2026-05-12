package com.propertymanagement.modules.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ComplaintReplyRequest {
    @NotBlank
    private String message;
}
