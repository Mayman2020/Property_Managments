package com.propertymanagement.modules.maintenance.category.service;

import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import com.propertymanagement.modules.maintenance.category.entity.MaintenanceCategory;
import com.propertymanagement.modules.maintenance.category.repository.MaintenanceCategoryRepository;

@Service
@RequiredArgsConstructor
public class MaintenanceCategoryService {

    private final MaintenanceCategoryRepository categoryRepository;

    public List<MaintenanceCategory> getAll() {
        return categoryRepository.findByActiveTrue();
    }

    public MaintenanceCategory getById(Long id) {
        return categoryRepository.findById(id)
                .filter(MaintenanceCategory::isActive)
                .orElseThrow(() -> AppException.notFound("Category not found: " + id));
    }
}
