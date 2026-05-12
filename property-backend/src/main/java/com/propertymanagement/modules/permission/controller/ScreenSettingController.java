package com.propertymanagement.modules.permission.controller;

import com.propertymanagement.modules.permission.service.ScreenSettingService;
import com.propertymanagement.modules.permission.dto.ScreenSettingResponseDTO;
import com.propertymanagement.modules.permission.dto.ScreenSettingUpdateRequestDTO;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/screen-settings")
@RequiredArgsConstructor
public class ScreenSettingController {

    private final ScreenSettingService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ScreenSettingResponseDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @PutMapping("/{screenKey}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ScreenSettingResponseDTO>> update(
            @PathVariable String screenKey,
            @Valid @RequestBody ScreenSettingUpdateRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(screenKey, request)));
    }
}
