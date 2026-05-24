package com.propertymanagement.modules.ownerportal.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.ownerportal.entity.OwnerStatement;

public interface OwnerStatementRepository extends JpaRepository<OwnerStatement, Long> {
    List<OwnerStatement> findByOwnerIdOrderByStatementYearDescStatementMonthDesc(Long ownerId);
    List<OwnerStatement> findAllByOrderByStatementYearDescStatementMonthDesc();

    Optional<OwnerStatement> findByOwnerIdAndPropertyIdAndStatementYearAndStatementMonth(
            Long ownerId, Long propertyId, Integer statementYear, Integer statementMonth);
}
