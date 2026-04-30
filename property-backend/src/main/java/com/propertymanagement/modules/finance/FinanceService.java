package com.propertymanagement.modules.finance;

import com.propertymanagement.modules.finance.budget.BudgetQueryRepository;
import com.propertymanagement.modules.finance.budget.dto.BudgetResponse;
import com.propertymanagement.modules.finance.dto.FinanceDashboardResponse;
import com.propertymanagement.modules.finance.dto.FinancialReportRowResponse;
import com.propertymanagement.modules.finance.expense.Expense;
import com.propertymanagement.modules.finance.expense.ExpenseRepository;
import com.propertymanagement.modules.finance.expense.ExpenseWriterRepository;
import com.propertymanagement.modules.finance.expense.dto.CreateExpenseRequest;
import com.propertymanagement.modules.finance.expense.dto.ExpenseResponse;
import com.propertymanagement.modules.finance.pettycash.PettyCashRepository;
import com.propertymanagement.modules.finance.pettycash.dto.PettyCashFundResponse;
import com.propertymanagement.modules.finance.revenue.OtherRevenue;
import com.propertymanagement.modules.finance.revenue.OtherRevenueRepository;
import com.propertymanagement.modules.finance.revenue.OtherRevenueWriterRepository;
import com.propertymanagement.modules.finance.revenue.dto.CreateRevenueRequest;
import com.propertymanagement.modules.finance.revenue.dto.OtherRevenueResponse;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.ownerportal.OwnerStatementRepository;
import com.propertymanagement.modules.property.PropertyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FinanceService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final OtherRevenueRepository revenueRepository;
    private final OtherRevenueWriterRepository revenueWriterRepository;
    private final PettyCashRepository pettyCashRepository;
    private final BudgetQueryRepository budgetRepository;
    private final OwnerStatementRepository ownerStatementRepository;
    private final OwnerRepository ownerRepository;
    private final PropertyRepository propertyRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public FinanceDashboardResponse getDashboard(Long propertyId) {
        Object[] row = (Object[]) entityManager.createNativeQuery("""
                SELECT COALESCE(SUM(this_month_collected), 0),
                       COALESCE(SUM(this_month_expenses), 0),
                       COALESCE(SUM(this_month_collected - this_month_expenses), 0),
                       COALESCE(SUM(overdue_amount), 0)
                FROM dashboard_financial
                WHERE (:propertyId IS NULL OR property_id = :propertyId)
                """)
                .setParameter("propertyId", propertyId)
                .getSingleResult();

        BigDecimal expenses = n(row[1]);
        BigDecimal budgetTotal = (propertyId == null
                ? budgetRepository.findAllRows()
                : budgetRepository.findAllRowsByProperty(propertyId)).stream()
                .map(BudgetQueryRepository.BudgetRow::getBudgetedAmount)
                .map(this::n)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal budgetPct = budgetTotal.signum() == 0
                ? BigDecimal.ZERO
                : expenses.multiply(BigDecimal.valueOf(100)).divide(budgetTotal, 2, java.math.RoundingMode.HALF_UP);

        return FinanceDashboardResponse.builder()
                .thisMonthCollected(n(row[0]))
                .thisMonthExpenses(expenses)
                .netIncome(n(row[2]))
                .overdueAmount(n(row[3]))
                .budgetUtilizationPct(budgetPct)
                .build();
    }

    public Page<ExpenseResponse> getExpenses(Pageable pageable, String q, Long propertyId, String lang) {
        return expenseRepository.search(trimToNull(q), propertyId, normalizeLang(lang), pageable).map(row -> ExpenseResponse.builder()
                .id(row.getId())
                .expenseNumber(row.getExpenseNumber())
                .description(row.getDescription())
                .amount(row.getAmount())
                .currency(row.getCurrency())
                .expenseDate(row.getExpenseDate())
                .status(row.getStatus())
                .categoryName(row.getCategoryName())
                .build());
    }

    public Page<OtherRevenueResponse> getRevenues(Pageable pageable, String q, Long propertyId, String lang) {
        return revenueRepository.search(trimToNull(q), propertyId, normalizeLang(lang), pageable).map(row -> OtherRevenueResponse.builder()
                .id(row.getId())
                .revenueNumber(row.getRevenueNumber())
                .description(row.getDescription())
                .amount(row.getAmount())
                .currency(row.getCurrency())
                .revenueDate(row.getRevenueDate())
                .categoryName(row.getCategoryName())
                .build());
    }

    public List<PettyCashFundResponse> getPettyCashFunds(Long propertyId) {
        return (propertyId == null
                ? pettyCashRepository.findByActiveTrueOrderByIdDesc()
                : pettyCashRepository.findByPropertyIdAndActiveTrueOrderByIdDesc(propertyId)).stream()
                .map(item -> PettyCashFundResponse.builder()
                        .id(item.getId())
                        .fundName(item.getFundName())
                        .openingBalance(item.getOpeningBalance())
                        .currentBalance(item.getCurrentBalance())
                        .maxTransaction(item.getMaxTransaction())
                        .build())
                .toList();
    }

    public List<BudgetResponse> getBudgets(Long propertyId) {
        return (propertyId == null
                ? budgetRepository.findAllRows()
                : budgetRepository.findAllRowsByProperty(propertyId)).stream()
                .map(row -> BudgetResponse.builder()
                        .id(row.getId())
                        .propertyId(row.getPropertyId())
                        .categoryName(row.getCategoryName())
                        .budgetedAmount(row.getBudgetedAmount())
                        .build())
                .toList();
    }

    public List<FinancialReportRowResponse> getPnlReport(Long propertyId, Integer yearFrom, Integer yearTo) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT property_name, year, month, COALESCE(rent_revenue, 0) + COALESCE(other_revenue, 0) AS total_revenue,
                       COALESCE(total_expenses, 0) AS total_expenses,
                       (COALESCE(rent_revenue, 0) + COALESCE(other_revenue, 0) - COALESCE(total_expenses, 0)) AS net_income
                FROM property_pnl
                WHERE (:propertyId IS NULL OR property_id = :propertyId)
                  AND (:yearFrom IS NULL OR year >= :yearFrom)
                  AND (:yearTo IS NULL OR year <= :yearTo)
                ORDER BY year DESC, month DESC, property_name ASC
                """)
                .setParameter("propertyId", propertyId)
                .setParameter("yearFrom", yearFrom)
                .setParameter("yearTo", yearTo)
                .getResultList();
        List<FinancialReportRowResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(FinancialReportRowResponse.builder()
                    .propertyName((String) row[0])
                    .year(intVal(row[1]))
                    .month(intVal(row[2]))
                    .totalRevenue(n(row[3]))
                    .totalExpenses(n(row[4]))
                    .netIncome(n(row[5]))
                    .build());
        }
        return result;
    }

    public List<FinancialReportRowResponse> getCashFlowReport(Long propertyId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT year_part, month_part, SUM(cash_in) AS cash_in, SUM(cash_out) AS cash_out
                FROM (
                    SELECT EXTRACT(YEAR FROM rp.payment_date) AS year_part,
                           EXTRACT(MONTH FROM rp.payment_date) AS month_part,
                           rp.amount_paid AS cash_in,
                           0 AS cash_out
                    FROM rent_payments rp
                    LEFT JOIN lease_contracts lc ON lc.id = rp.contract_id
                    WHERE (:propertyId IS NULL OR lc.property_id = :propertyId)
                    UNION ALL
                    SELECT EXTRACT(YEAR FROM r.revenue_date),
                           EXTRACT(MONTH FROM r.revenue_date),
                           r.amount,
                           0
                    FROM other_revenues r
                    WHERE (:propertyId IS NULL OR r.property_id = :propertyId)
                    UNION ALL
                    SELECT EXTRACT(YEAR FROM e.expense_date),
                           EXTRACT(MONTH FROM e.expense_date),
                           0,
                           e.amount
                    FROM expenses e
                    WHERE e.status = 'PAID'
                      AND (:propertyId IS NULL OR e.property_id = :propertyId)
                ) flow
                GROUP BY year_part, month_part
                ORDER BY year_part DESC, month_part DESC
                """)
                .setParameter("propertyId", propertyId)
                .getResultList();
        List<FinancialReportRowResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(FinancialReportRowResponse.builder()
                    .year(intVal(row[0]))
                    .month(intVal(row[1]))
                    .cashIn(n(row[2]))
                    .cashOut(n(row[3]))
                    .build());
        }
        return result;
    }

    public List<FinancialReportRowResponse> getOwnerStatementReport(Long propertyId) {
        return ownerStatementRepository.findAllByOrderByStatementYearDescStatementMonthDesc().stream()
                .filter(statement -> propertyId == null || propertyId.equals(statement.getPropertyId()))
                .map(statement -> FinancialReportRowResponse.builder()
                        .propertyName(propertyRepository.findById(statement.getPropertyId()).map(p -> p.getPropertyName()).orElse(null))
                        .ownerName(ownerRepository.findById(statement.getOwnerId()).map(o -> o.getFullName()).orElse(null))
                        .statementMonth(statement.getStatementMonth())
                        .statementYear(statement.getStatementYear())
                        .totalRevenue(statement.getTotalRevenue())
                        .totalExpenses(statement.getTotalExpenses())
                        .ownerNetAmount(statement.getOwnerNetAmount())
                        .build())
                .toList();
    }

    public ExpenseResponse createExpense(CreateExpenseRequest req) {
        String prefix = "EXP-" + java.time.Year.now().getValue() + "-";
        long seq = expenseWriterRepository.countByExpenseNumberStartingWith(prefix) + 1;
        String expenseNumber = prefix + String.format("%04d", seq);

        Expense expense = Expense.builder()
                .expenseNumber(expenseNumber)
                .propertyId(req.getPropertyId())
                .categoryId(req.getCategoryId())
                .vendorId(req.getVendorId())
                .description(req.getDescription())
                .amount(req.getAmount())
                .currency(req.getCurrency() != null ? req.getCurrency() : "OMR")
                .expenseDate(LocalDate.parse(req.getExpenseDate(), DateTimeFormatter.ISO_LOCAL_DATE))
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        expense = expenseWriterRepository.save(expense);
        return ExpenseResponse.builder()
                .id(expense.getId())
                .expenseNumber(expense.getExpenseNumber())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .currency(expense.getCurrency())
                .expenseDate(expense.getExpenseDate())
                .status(expense.getStatus())
                .build();
    }

    public OtherRevenueResponse createRevenue(CreateRevenueRequest req) {
        String prefix = "REV-" + java.time.Year.now().getValue() + "-";
        long seq = revenueWriterRepository.countByRevenueNumberStartingWith(prefix) + 1;
        String revenueNumber = prefix + String.format("%04d", seq);

        OtherRevenue revenue = OtherRevenue.builder()
                .revenueNumber(revenueNumber)
                .propertyId(req.getPropertyId())
                .categoryId(req.getCategoryId())
                .description(req.getDescription())
                .amount(req.getAmount())
                .currency(req.getCurrency() != null ? req.getCurrency() : "OMR")
                .revenueDate(LocalDate.parse(req.getRevenueDate(), DateTimeFormatter.ISO_LOCAL_DATE))
                .createdAt(LocalDateTime.now())
                .build();

        revenue = revenueWriterRepository.save(revenue);
        return OtherRevenueResponse.builder()
                .id(revenue.getId())
                .revenueNumber(revenue.getRevenueNumber())
                .description(revenue.getDescription())
                .amount(revenue.getAmount())
                .currency(revenue.getCurrency())
                .revenueDate(revenue.getRevenueDate())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeLang(String lang) {
        return lang != null && lang.toLowerCase().startsWith("ar") ? "ar" : "en";
    }

    private BigDecimal n(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bigDecimal) return bigDecimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return new BigDecimal(String.valueOf(value));
    }

    private Integer intVal(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.intValue();
        return Integer.parseInt(String.valueOf(value));
    }
}
