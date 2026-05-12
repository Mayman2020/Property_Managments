package com.propertymanagement.modules.complaint.dto;

import lombok.Data;

@Data
public class CreateMaintenanceFromComplaintDto {
    private Long categoryId;
    private String titleOverride;
}
