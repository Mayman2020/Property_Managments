package com.propertymanagement.modules.moduleconfig.controller;

import com.propertymanagement.modules.moduleconfig.service.PropertyModuleSettingService;
import com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponseDTO;
import com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingsUpdateRequestDTO;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.property.entity.Property;

@RestController
@RequestMapping("/property-modules")
@RequiredArgsConstructor
public class PropertyModuleSettingController {

    private final PropertyModuleSettingService service;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PropertyModuleSettingResponseDTO>>> getMine() {
        return ResponseEntity.ok(ApiResponse.ok(service.getMySettings()));
    }

    @GetMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<PropertyModuleSettingResponseDTO>>> getByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByProperty(propertyId)));
    }

    @PutMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<PropertyModuleSettingResponseDTO>>> update(
            @PathVariable Long propertyId,
            @Valid @RequestBody PropertyModuleSettingsUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Property modules updated successfully", service.updateProperty(propertyId, request)));
    }
}
