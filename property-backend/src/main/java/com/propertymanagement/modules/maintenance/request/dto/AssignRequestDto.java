package com.propertymanagement.modules.maintenance.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignRequestDto {
    @NotNull
    private Long officerId;
}
