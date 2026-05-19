package com.propertymanagement.modules.property.dto;

import com.propertymanagement.modules.property.entity.PropertyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.user.entity.User;

@Data
public class PropertyRequest {
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private Map<Integer, Integer> floorUnitsConfig;

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
    private List<String> coverImageUrls;

    /** One or more owner IDs — first entry is treated as the primary owner. */
    @NotEmpty
    private List<Long> ownerIds;

    private List<String> ownerDocumentFiles;

    /** Optional: provider type for default maintenance routing — "USER" or "COMPANY". */
    private String maintenanceProviderType;

    /** Optional: IDs of maintenance officers (USER) or contractor companies (COMPANY) for default routing. */
    private List<Long> maintenanceProviderIds;

    private Long legalEntityId;
}
