package com.propertymanagement.modules.finance.expense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.finance.expense.entity.Expense;

import java.util.Optional;

public interface ExpenseWriterRepository extends JpaRepository<Expense, Long> {
    long countByExpenseNumberStartingWith(String prefix);
    Optional<Expense> findByExpenseNumber(String expenseNumber);
}
