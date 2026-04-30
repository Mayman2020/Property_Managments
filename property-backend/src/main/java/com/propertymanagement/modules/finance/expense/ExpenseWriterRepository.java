package com.propertymanagement.modules.finance.expense;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseWriterRepository extends JpaRepository<Expense, Long> {
    long countByExpenseNumberStartingWith(String prefix);
}
