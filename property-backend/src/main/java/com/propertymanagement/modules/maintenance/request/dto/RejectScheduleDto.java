package com.propertymanagement.modules.maintenance.request.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectScheduleDto {
    @NotBlank
    private String rejectionNote;
}
