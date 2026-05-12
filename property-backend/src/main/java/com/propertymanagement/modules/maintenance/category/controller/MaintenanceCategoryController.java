package com.propertymanagement.modules.maintenance.category.controller;

import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.maintenance.category.service.MaintenanceCategoryService;
import com.propertymanagement.modules.maintenance.category.entity.MaintenanceCategory;

@RestController
@RequestMapping("/maintenance/categories")
@RequiredArgsConstructor
public class MaintenanceCategoryController {

    private final MaintenanceCategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MaintenanceCategory>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenanceCategory>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.getById(id)));
    }
}
