package com.propertymanagement.modules.finance.expense.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import com.propertymanagement.modules.finance.expense.entity.Expense;

public interface ExpenseRepository extends Repository<Expense, Long> {

    @Query(value = """
            SELECT e.id AS id,
                   e.expense_number AS expenseNumber,
                   e.description AS description,
                   e.amount AS amount,
                   e.currency AS currency,
                   e.expense_date AS expenseDate,
                   e.status AS status,
                   CASE WHEN :lang = 'ar'
                        THEN COALESCE(ec.category_name_ar, ec.category_name_en)
                        ELSE COALESCE(ec.category_name_en, ec.category_name_ar)
                   END AS categoryName
            FROM expenses e
            LEFT JOIN expense_categories ec ON ec.id = e.category_id
            WHERE (:propertyId IS NULL OR e.property_id = :propertyId)
              AND (:q IS NULL OR
                   LOWER(COALESCE(e.description, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.expense_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY e.expense_date DESC, e.id DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM expenses e
            WHERE (:propertyId IS NULL OR e.property_id = :propertyId)
              AND (:q IS NULL OR
                   LOWER(COALESCE(e.description, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.expense_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            nativeQuery = true)
    Page<ExpenseRow> search(@Param("q") String q, @Param("propertyId") Long propertyId, @Param("lang") String lang, Pageable pageable);

    @Query(value = """
            SELECT e.id AS id,
                   e.expense_number AS expenseNumber,
                   e.description AS description,
                   e.amount AS amount,
                   e.currency AS currency,
                   e.expense_date AS expenseDate,
                   e.status AS status,
                   CASE WHEN :lang = 'ar'
                        THEN COALESCE(ec.category_name_ar, ec.category_name_en)
                        ELSE COALESCE(ec.category_name_en, ec.category_name_ar)
                   END AS categoryName
            FROM expenses e
            LEFT JOIN expense_categories ec ON ec.id = e.category_id
            WHERE e.property_id IN (:propertyIds)
              AND (:q IS NULL OR
                   LOWER(COALESCE(e.description, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.expense_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY e.expense_date DESC, e.id DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM expenses e
            WHERE e.property_id IN (:propertyIds)
              AND (:q IS NULL OR
                   LOWER(COALESCE(e.description, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.expense_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            nativeQuery = true)
    Page<ExpenseRow> searchInPropertyIds(
            @Param("q") String q,
            @Param("propertyIds") Collection<Long> propertyIds,
            @Param("lang") String lang,
            Pageable pageable);

    interface ExpenseRow {
        Long getId();
        String getExpenseNumber();
        String getDescription();
        BigDecimal getAmount();
        String getCurrency();
        LocalDate getExpenseDate();
        String getStatus();
        String getCategoryName();
    }
}
