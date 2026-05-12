package com.propertymanagement.modules.finance.controller;

import com.propertymanagement.modules.finance.budget.dto.BudgetResponse;
import com.propertymanagement.modules.finance.dto.FinanceDashboardResponse;
import com.propertymanagement.modules.finance.dto.FinancialReportRowResponse;
import com.propertymanagement.modules.finance.expense.dto.CreateExpenseRequest;
import com.propertymanagement.modules.finance.expense.dto.ExpenseResponse;
import com.propertymanagement.modules.finance.revenue.dto.CreateRevenueRequest;
import com.propertymanagement.modules.finance.revenue.dto.OtherRevenueResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.finance.service.FinanceService;
import com.propertymanagement.modules.owner.entity.Owner;

@RestController
@RequestMapping("/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService service;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<FinanceDashboardResponse>> dashboard(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboard(propertyId)));
    }

    @GetMapping("/expenses")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<Page<ExpenseResponse>>> expenses(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestHeader(name = "Accept-Language", required = false) String lang,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getExpenses(pageable, q, propertyId, lang)));
    }

    @GetMapping("/revenues")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<Page<OtherRevenueResponse>>> revenues(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestHeader(name = "Accept-Language", required = false) String lang,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getRevenues(pageable, q, propertyId, lang)));
    }

    @PostMapping("/expenses")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(
            @Valid @RequestBody CreateExpenseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createExpense(request)));
    }

    @PostMapping("/revenues")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<OtherRevenueResponse>> createRevenue(
            @Valid @RequestBody CreateRevenueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createRevenue(request)));
    }

    @GetMapping("/budgets")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<BudgetResponse>>> budgets(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getBudgets(propertyId)));
    }

    @GetMapping("/reports/pnl")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<FinancialReportRowResponse>>> pnl(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo) {
        return ResponseEntity.ok(ApiResponse.ok(service.getPnlReport(propertyId, yearFrom, yearTo)));
    }

    @GetMapping("/reports/cashflow")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<FinancialReportRowResponse>>> cashFlow(@RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCashFlowReport(propertyId)));
    }

    @GetMapping("/reports/owner-statements")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<FinancialReportRowResponse>>> ownerStatements(@RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getOwnerStatementReport(propertyId)));
    }
}
