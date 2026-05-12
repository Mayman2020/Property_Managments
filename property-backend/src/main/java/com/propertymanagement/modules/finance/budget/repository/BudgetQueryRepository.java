package com.propertymanagement.modules.finance.budget.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.math.BigDecimal;
import java.util.List;
import com.propertymanagement.modules.finance.budget.entity.BudgetEntity;

public interface BudgetQueryRepository extends Repository<BudgetEntity, Long> {

    @Query(value = """
            SELECT b.id AS id,
                   b.property_id AS propertyId,
                   COALESCE(ec.category_name_ar, ec.category_name_en) AS categoryName,
                   b.budgeted_amount AS budgetedAmount
            FROM budgets b
            LEFT JOIN expense_categories ec ON ec.id = b.category_id
            ORDER BY b.id DESC
            """, nativeQuery = true)
    List<BudgetRow> findAllRows();

    @Query(value = """
            SELECT b.id AS id,
                   b.property_id AS propertyId,
                   COALESCE(ec.category_name_ar, ec.category_name_en) AS categoryName,
                   b.budgeted_amount AS budgetedAmount
            FROM budgets b
            LEFT JOIN expense_categories ec ON ec.id = b.category_id
            WHERE b.property_id = :propertyId
            ORDER BY b.id DESC
            """, nativeQuery = true)
    List<BudgetRow> findAllRowsByProperty(Long propertyId);

    interface BudgetRow {
        Long getId();
        Long getPropertyId();
        String getCategoryName();
        BigDecimal getBudgetedAmount();
    }
}
