package com.propertymanagement.modules.inspection.dto;

import com.propertymanagement.modules.inspection.entity.ItemCondition;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class InspectionItemResponse {
    private Long id;
    private String area;
    private ItemCondition condition;
    private String notes;
    private String photoUrl;
    private BigDecimal estimatedDeduction;
}
