package com.propertymanagement.modules.finance.expense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.finance.expense.entity.Expense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public interface ExpenseWriterRepository extends JpaRepository<Expense, Long> {
    long countByExpenseNumberStartingWith(String prefix);
    Optional<Expense> findByExpenseNumber(String expenseNumber);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.propertyId = :propertyId AND e.categoryId = :categoryId
              AND e.expenseDate >= :from AND e.expenseDate <= :to
            """)
    BigDecimal sumAmountByPropertyCategoryBetween(
            @org.springframework.data.repository.query.Param("propertyId") Long propertyId,
            @org.springframework.data.repository.query.Param("categoryId") Long categoryId,
            @org.springframework.data.repository.query.Param("from") LocalDate from,
            @org.springframework.data.repository.query.Param("to") LocalDate to);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.propertyId = :propertyId
              AND e.expenseDate >= :from AND e.expenseDate <= :to
            """)
    BigDecimal sumAmountByPropertyBetween(
            @org.springframework.data.repository.query.Param("propertyId") Long propertyId,
            @org.springframework.data.repository.query.Param("from") LocalDate from,
            @org.springframework.data.repository.query.Param("to") LocalDate to);

    java.util.List<Expense> findByExpenseDateBetweenOrderByExpenseDateAsc(LocalDate from, LocalDate to);
}
