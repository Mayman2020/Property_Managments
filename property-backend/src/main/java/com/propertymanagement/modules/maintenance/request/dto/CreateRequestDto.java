package com.propertymanagement.modules.maintenance.request.dto;

import com.propertymanagement.modules.maintenance.request.RequestPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateRequestDto {
    @NotNull
    private Long propertyId;
    @NotNull
    private Long unitId;
    private Long tenantId;
    private Long categoryId;
    private List<Long> categoryIds;
    @NotBlank
    private String title;
    @NotBlank
    private String description;
    private RequestPriority priority = RequestPriority.NORMAL;
    private String tenantNotes;

    public Long getResolvedCategoryId() {
        if (categoryIds != null && !categoryIds.isEmpty()) {
            return categoryIds.get(0);
        }
        return categoryId;
    }
}
