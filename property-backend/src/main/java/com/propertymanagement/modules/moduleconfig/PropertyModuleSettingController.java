package com.propertymanagement.modules.moduleconfig;

import com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponse;
import com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingsUpdateRequest;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/property-modules")
@RequiredArgsConstructor
public class PropertyModuleSettingController {

    private final PropertyModuleSettingService service;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PropertyModuleSettingResponse>>> getMine() {
        return ResponseEntity.ok(ApiResponse.ok(service.getMySettings()));
    }

    @GetMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<PropertyModuleSettingResponse>>> getByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByProperty(propertyId)));
    }

    @PutMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<PropertyModuleSettingResponse>>> update(
            @PathVariable Long propertyId,
            @Valid @RequestBody PropertyModuleSettingsUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Property modules updated successfully", service.updateProperty(propertyId, request)));
    }
}
