package com.propertymanagement.modules.maintenance.category.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.propertymanagement.modules.maintenance.category.entity.MaintenanceCategory;

import java.util.List;

@Repository
public interface MaintenanceCategoryRepository extends JpaRepository<MaintenanceCategory, Long> {
    List<MaintenanceCategory> findByActiveTrue();
}
