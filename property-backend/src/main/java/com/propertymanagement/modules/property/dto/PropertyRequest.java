package com.propertymanagement.modules.property.dto;

import com.propertymanagement.modules.property.PropertyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class PropertyRequest {
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;

    @Size(max = 80)
    private String propertyCode;

    @NotNull
    private PropertyType propertyType;

    @NotBlank
    private String address;

    private String city;
    private String country;

    @Size(max = 1000)
    private String googleMapUrl;

    private Integer totalFloors = 1;
    private Integer totalUnits = 0;
    private String description;
    private String coverImageUrl;
    private String ownerNameAr;
    private String ownerNameEn;
    private String ownerEmail;
    private String ownerCivilId;

    @NotNull
    private Long ownerId;
    @NotEmpty
    private List<String> ownerDocumentFiles;

    /** Optional: internal maintenance officer (user id) for this property — mutually exclusive with contractor company. */
    private Long maintenanceInternalOfficerUserId;

    /** Optional: contractor company responsible for maintenance — mutually exclusive with internal officer. */
    private Long maintenanceContractorCompanyId;
}
