package com.propertymanagement.modules.lookup.dto;

import com.propertymanagement.modules.lookup.LookupType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LookupResponse {
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
