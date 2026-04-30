package com.propertymanagement.modules.ownerportal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OwnerStatementRepository extends JpaRepository<OwnerStatement, Long> {
    List<OwnerStatement> findByOwnerIdOrderByStatementYearDescStatementMonthDesc(Long ownerId);
    List<OwnerStatement> findAllByOrderByStatementYearDescStatementMonthDesc();
}
