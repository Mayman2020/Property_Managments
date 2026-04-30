package com.propertymanagement.modules.finance.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExpenseCategoryLookupRepository extends JpaRepository<ExpenseCategory, Long> {
    Optional<ExpenseCategory> findByCategoryCode(String categoryCode);
}
