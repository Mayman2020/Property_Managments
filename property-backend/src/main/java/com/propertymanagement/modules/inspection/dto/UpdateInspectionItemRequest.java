package com.propertymanagement.modules.inspection.dto;

import com.propertymanagement.modules.inspection.entity.ItemCondition;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class UpdateInspectionItemRequest {
    private ItemCondition condition;
    private String notes;
    private String photoUrl;
    private BigDecimal estimatedDeduction;
}
