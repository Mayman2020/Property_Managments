package com.propertymanagement.modules.finance.revenue.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.finance.revenue.entity.OtherRevenue;

public interface OtherRevenueWriterRepository extends JpaRepository<OtherRevenue, Long> {
    long countByRevenueNumberStartingWith(String prefix);
    boolean existsByDescriptionContaining(String marker);
}
