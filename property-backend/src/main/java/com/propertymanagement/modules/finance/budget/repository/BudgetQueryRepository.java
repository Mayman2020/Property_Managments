package com.propertymanagement.modules.finance.budget.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import com.propertymanagement.modules.finance.budget.entity.BudgetEntity;

public interface BudgetQueryRepository extends Repository<BudgetEntity, Long> {

    @Query(value = """
            SELECT b.id AS id,
                   b.property_id AS propertyId,
                   b.category_id AS categoryId,
                   b.budgeted_amount AS budgetedAmount,
                   b.financial_period_id AS financialPeriodId,
                   fp.period_name AS periodName,
                   fp.start_date AS periodStart,
                   fp.end_date AS periodEnd,
                   ec.category_name_ar AS categoryNameAr,
                   ec.category_name_en AS categoryNameEn,
                   p.property_name AS propertyName,
                   p.property_name_ar AS propertyNameAr,
                   p.property_name_en AS propertyNameEn
            FROM budgets b
            INNER JOIN financial_periods fp ON fp.id = b.financial_period_id
            LEFT JOIN expense_categories ec ON ec.id = b.category_id
            LEFT JOIN properties p ON p.id = b.property_id
            WHERE (:propertyId IS NULL OR b.property_id = :propertyId)
              AND (:year IS NULL OR EXTRACT(YEAR FROM fp.start_date) = :year)
            ORDER BY p.id NULLS LAST, ec.category_name_en NULLS LAST, b.id DESC
            """, nativeQuery = true)
    List<DetailedBudgetRow> findDetailedRows(@Param("propertyId") Long propertyId, @Param("year") Integer year);

    @Query(value = """
            SELECT b.id AS id,
                   b.property_id AS propertyId,
                   b.category_id AS categoryId,
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
                   b.category_id AS categoryId,
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
        Long getCategoryId();
        String getCategoryName();
        BigDecimal getBudgetedAmount();
    }

    interface DetailedBudgetRow {
        Long getId();
        Long getPropertyId();
        Long getCategoryId();
        BigDecimal getBudgetedAmount();
        Long getFinancialPeriodId();
        String getPeriodName();
        LocalDate getPeriodStart();
        LocalDate getPeriodEnd();
        String getCategoryNameAr();
        String getCategoryNameEn();
        String getPropertyName();
        String getPropertyNameAr();
        String getPropertyNameEn();
    }
}
