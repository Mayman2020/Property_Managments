package com.propertymanagement.modules.finance.revenue.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.finance.revenue.entity.RevenueCategory;

import java.util.Optional;

public interface RevenueCategoryRepository extends JpaRepository<RevenueCategory, Long> {
    Optional<RevenueCategory> findByCategoryCode(String categoryCode);
}
