package com.propertymanagement.modules.finance.revenue;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtherRevenueWriterRepository extends JpaRepository<OtherRevenue, Long> {
    long countByRevenueNumberStartingWith(String prefix);
}
