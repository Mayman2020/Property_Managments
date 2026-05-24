package com.propertymanagement.modules.inspection.dto;

import com.propertymanagement.modules.inspection.entity.InspectionType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateInspectionRequest {
    @NotNull
    private InspectionType type;
}
