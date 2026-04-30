package com.propertymanagement.modules.inspection.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class InspectionRequest {
    @NotNull private Long unitId;
    private Long contractId;
    private String inspectionType;
    @NotNull private LocalDate inspectionDate;
    private Integer wallsCondition;
    private Integer floorsCondition;
    private Integer doorsCondition;
    private Integer windowsCondition;
    private Integer plumbingCondition;
    private Integer electricalCondition;
    private Integer acCondition;
    private String overallCondition;
    private String notes;
    private String damagesDescription;
    private BigDecimal deductionsAmount;
    private Long officerId;
}
