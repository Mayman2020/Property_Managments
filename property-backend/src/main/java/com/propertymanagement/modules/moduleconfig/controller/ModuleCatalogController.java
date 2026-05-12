package com.propertymanagement.modules.moduleconfig.controller;

import com.propertymanagement.modules.moduleconfig.service.ModuleCatalogService;
import com.propertymanagement.modules.moduleconfig.dto.ModuleDefinitionResponseDTO;
import com.propertymanagement.modules.moduleconfig.dto.ModulePresetResponseDTO;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/module-catalog")
@RequiredArgsConstructor
public class ModuleCatalogController {

    private final ModuleCatalogService service;

    @GetMapping("/definitions")
    public ResponseEntity<ApiResponse<List<ModuleDefinitionResponseDTO>>> getDefinitions() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDefinitions()));
    }

    @GetMapping("/presets")
    public ResponseEntity<ApiResponse<List<ModulePresetResponseDTO>>> getPresets() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPresets()));
    }
}
