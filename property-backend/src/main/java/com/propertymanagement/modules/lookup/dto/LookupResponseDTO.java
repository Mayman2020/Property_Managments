package com.propertymanagement.modules.LookupEntity.dto;

import com.propertymanagement.modules.LookupEntity.entity.LookupType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LookupResponseDTO {
    private Long id;
    private LookupType type;
    private String code;
    private String nameAr;
    private String nameEn;
    private Long parentId;
    private Integer sortOrder;
    private boolean active;
    private boolean locked;
}
