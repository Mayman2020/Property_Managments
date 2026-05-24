package com.propertymanagement.modules.inspection.dto;

import com.propertymanagement.modules.inspection.entity.InspectionStatus;
import com.propertymanagement.modules.inspection.entity.InspectionType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class InspectionResponse {
    private Long id;
    private Long unitId;
    private Long contractId;
    private InspectionType inspectionType;
    private InspectionStatus status;
    private Long inspectorId;
    private LocalDateTime tenantSignedAt;
    private LocalDateTime inspectorSignedAt;
    private String notes;
    private BigDecimal totalDeduction;
    private LocalDateTime createdAt;
    private List<InspectionItemResponse> items;
}
