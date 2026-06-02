package com.propertymanagement.modules.finance.budget.service;

import com.propertymanagement.modules.finance.budget.dto.BudgetResponse;
import com.propertymanagement.modules.finance.budget.repository.BudgetQueryRepository;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.reports.dto.BudgetVsActualResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BudgetAnalyticsService {

    private final BudgetQueryRepository budgetRepository;
    private final ExpenseWriterRepository expenseWriterRepository;

    public List<BudgetResponse> buildBudgetViews(Long propertyId, Integer year, String lang, Set<Long> ownerScope) {
        int effectiveYear = year != null ? year : LocalDate.now().getYear();
        LocalDate today = LocalDate.now();
        List<BudgetQueryRepository.DetailedBudgetRow> rows = budgetRepository.findDetailedRows(propertyId, effectiveYear);
        List<BudgetResponse> result = new ArrayList<>();
        for (BudgetQueryRepository.DetailedBudgetRow row : rows) {
            if (ownerScope != null && (row.getPropertyId() == null || !ownerScope.contains(row.getPropertyId()))) {
                continue;
            }
            result.add(toBudgetResponse(row, lang, today));
        }
        return result;
    }

    public BudgetVsActualResponse buildBudgetVsActual(Long propertyId, Integer year, Set<Long> ownerScope) {
        int effectiveYear = year != null ? year : LocalDate.now().getYear();
        LocalDate today = LocalDate.now();
        List<BudgetQueryRepository.DetailedBudgetRow> rows = budgetRepository.findDetailedRows(propertyId, effectiveYear);

        BigDecimal totalBudgeted = BigDecimal.ZERO;
        BigDecimal totalActual = BigDecimal.ZERO;
        List<BudgetVsActualResponse.CategoryRow> categoryRows = new ArrayList<>();

        for (BudgetQueryRepository.DetailedBudgetRow row : rows) {
            if (ownerScope != null && (row.getPropertyId() == null || !ownerScope.contains(row.getPropertyId()))) {
                continue;
            }
            ActualMetrics metrics = computeActualMetrics(row, today);
            totalBudgeted = totalBudgeted.add(metrics.budgeted());
            totalActual = totalActual.add(metrics.actual());

            categoryRows.add(BudgetVsActualResponse.CategoryRow.builder()
                    .budgetId(row.getId())
                    .propertyId(row.getPropertyId())
                    .propertyName(resolvePropertyName(row, "en"))
                    .categoryName(metrics.categoryLabel("en"))
                    .categoryNameAr(metrics.categoryLabel("ar"))
                    .categoryNameEn(metrics.categoryLabel("en"))
                    .budgetedAmount(metrics.budgeted())
                    .actualAmount(metrics.actual())
                    .variance(metrics.variance())
                    .utilizationPercent(metrics.utilizationPercent())
                    .overBudget(metrics.overBudget())
                    .build());
        }

        BigDecimal totalVariance = totalBudgeted.subtract(totalActual);
        double globalUtil = totalBudgeted.compareTo(BigDecimal.ZERO) > 0
                ? totalActual.divide(totalBudgeted, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;

        return BudgetVsActualResponse.builder()
                .totalBudgeted(totalBudgeted)
                .totalActual(totalActual)
                .totalVariance(totalVariance)
                .utilizationPercent(round(globalUtil))
                .rows(categoryRows)
                .build();
    }

    public BigDecimal computeUtilizationPct(Long propertyId, Set<Long> ownerScope) {
        List<BudgetResponse> rows = buildBudgetViews(propertyId, LocalDate.now().getYear(), "en", ownerScope);
        if (rows.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal totalBudget = rows.stream()
                .map(BudgetResponse::getBudgetedAmount)
                .map(this::n)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalActual = rows.stream()
                .map(BudgetResponse::getActualAmount)
                .map(this::n)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalBudget.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return totalActual.multiply(BigDecimal.valueOf(100))
                .divide(totalBudget, 2, RoundingMode.HALF_UP);
    }

    public Optional<OverBudgetAlert> findOverBudgetAlert(Long propertyId, Long categoryId, LocalDate expenseDate) {
        if (propertyId == null || categoryId == null) {
            return Optional.empty();
        }
        int year = expenseDate != null ? expenseDate.getYear() : LocalDate.now().getYear();
        LocalDate asOf = expenseDate != null ? expenseDate : LocalDate.now();
        return budgetRepository.findDetailedRows(propertyId, year).stream()
                .filter(row -> categoryId.equals(row.getCategoryId()))
                .findFirst()
                .map(row -> {
                    ActualMetrics metrics = computeActualMetrics(row, asOf);
                    if (metrics.budgeted().signum() > 0 && metrics.overBudget()) {
                        return new OverBudgetAlert(metrics.budgeted(), metrics.actual(), metrics.categoryLabel("ar"));
                    }
                    return null;
                })
                .filter(Objects::nonNull);
    }

    public record OverBudgetAlert(BigDecimal budgeted, BigDecimal actual, String categoryLabel) {}

    private BudgetResponse toBudgetResponse(BudgetQueryRepository.DetailedBudgetRow row, String lang, LocalDate asOf) {
        ActualMetrics metrics = computeActualMetrics(row, asOf);
        return BudgetResponse.builder()
                .id(row.getId())
                .propertyId(row.getPropertyId())
                .propertyName(resolvePropertyName(row, lang))
                .categoryId(row.getCategoryId())
                .categoryName(metrics.categoryLabel(lang))
                .categoryNameAr(metrics.categoryLabel("ar"))
                .categoryNameEn(metrics.categoryLabel("en"))
                .financialPeriodId(row.getFinancialPeriodId())
                .periodName(row.getPeriodName())
                .budgetedAmount(metrics.budgeted())
                .actualAmount(metrics.actual())
                .variance(metrics.variance())
                .utilizationPercent(metrics.utilizationPercent())
                .overBudget(metrics.overBudget())
                .build();
    }

    private ActualMetrics computeActualMetrics(BudgetQueryRepository.DetailedBudgetRow row, LocalDate asOf) {
        BigDecimal budgeted = n(row.getBudgetedAmount());
        LocalDate periodStart = row.getPeriodStart() != null ? row.getPeriodStart() : LocalDate.of(asOf.getYear(), 1, 1);
        LocalDate periodEnd = row.getPeriodEnd() != null ? row.getPeriodEnd() : LocalDate.of(asOf.getYear(), 12, 31);
        LocalDate effectiveTo = periodEnd.isBefore(asOf) ? periodEnd : asOf;
        BigDecimal actual = BigDecimal.ZERO;
        if (row.getPropertyId() != null && row.getCategoryId() != null && !effectiveTo.isBefore(periodStart)) {
            actual = n(expenseWriterRepository.sumAmountByPropertyCategoryBetween(
                    row.getPropertyId(), row.getCategoryId(), periodStart, effectiveTo));
        }
        BigDecimal variance = budgeted.subtract(actual);
        double utilization = budgeted.compareTo(BigDecimal.ZERO) > 0
                ? actual.divide(budgeted, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;
        return new ActualMetrics(
                budgeted,
                actual,
                variance,
                round(utilization),
                actual.compareTo(budgeted) > 0,
                row.getCategoryNameAr(),
                row.getCategoryNameEn()
        );
    }

    private String resolvePropertyName(BudgetQueryRepository.DetailedBudgetRow row, String lang) {
        boolean ar = lang != null && lang.toLowerCase().startsWith("ar");
        if (ar) {
            return firstNonBlank(row.getPropertyNameAr(), row.getPropertyNameEn(), row.getPropertyName());
        }
        return firstNonBlank(row.getPropertyNameEn(), row.getPropertyNameAr(), row.getPropertyName());
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private BigDecimal n(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record ActualMetrics(
            BigDecimal budgeted,
            BigDecimal actual,
            BigDecimal variance,
            double utilizationPercent,
            boolean overBudget,
            String categoryNameAr,
            String categoryNameEn
    ) {
        String categoryLabel(String lang) {
            boolean ar = lang != null && lang.toLowerCase().startsWith("ar");
            if (ar) {
                return categoryNameAr != null && !categoryNameAr.isBlank()
                        ? categoryNameAr
                        : (categoryNameEn != null ? categoryNameEn : "-");
            }
            return categoryNameEn != null && !categoryNameEn.isBlank()
                    ? categoryNameEn
                    : (categoryNameAr != null ? categoryNameAr : "-");
        }
    }
}
