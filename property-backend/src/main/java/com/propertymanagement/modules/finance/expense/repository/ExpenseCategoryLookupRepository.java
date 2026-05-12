package com.propertymanagement.modules.finance.expense.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import com.propertymanagement.modules.finance.expense.entity.ExpenseCategory;

public interface ExpenseCategoryLookupRepository extends JpaRepository<ExpenseCategory, Long> {
    Optional<ExpenseCategory> findByCategoryCode(String categoryCode);
}
