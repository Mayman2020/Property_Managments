package com.propertymanagement.modules.property.dto;

import com.propertymanagement.modules.property.entity.PropertyType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class PropertyResponse {

    @Data
    @Builder
    public static class OwnerSummary {
        private Long id;
        private String fullName;
        private String fullNameAr;
        private String fullNameEn;
        private String nationalId;
        private String phone;
        private String email;
    }

    @Data
    @Builder
    public static class MaintenanceProviderSummary {
        private Long id;
        private String providerType;
        private String name;
    }

    private Long id;
    private Long ownerId;
    private Long legalEntityId;
    private String legalEntityNameAr;
    private String legalEntityNameEn;
    /** Populated only on getById / create / update — null in list responses. */
    private List<OwnerSummary> owners;
    /** Populated only on getById / create / update — null in list responses. */
    private List<MaintenanceProviderSummary> maintenanceProviders;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private Map<Integer, Integer> floorUnitsConfig;
    private String propertyCode;
    private PropertyType propertyType;
    private String address;
    private String city;
    private String country;
    private String googleMapUrl;
    private Integer totalFloors;
    private Integer totalUnits;
    private String description;
    private String coverImageUrl;
    private List<String> coverImageUrls;
    private List<String> ownerDocumentFiles;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;
}
