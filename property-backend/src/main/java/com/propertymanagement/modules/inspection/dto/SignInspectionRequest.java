package com.propertymanagement.modules.inspection.dto;

import com.propertymanagement.modules.inspection.entity.InspectionSignerRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignInspectionRequest {
    @NotNull
    private InspectionSignerRole role;
}
