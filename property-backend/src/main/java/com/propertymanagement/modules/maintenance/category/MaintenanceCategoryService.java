package com.propertymanagement.modules.maintenance.category;

import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

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
