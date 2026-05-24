package com.propertymanagement.modules.inspection.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddInspectionItemRequest {
    private String area;
    private String notes;
}
