package com.propertymanagement.modules.finance.controller;

import com.propertymanagement.modules.finance.budget.dto.BudgetResponse;
import com.propertymanagement.modules.finance.dto.FinanceDashboardResponse;
import com.propertymanagement.modules.finance.dto.FinancialReportRowResponse;
import com.propertymanagement.modules.finance.expense.dto.CreateExpenseRequest;
import com.propertymanagement.modules.finance.expense.dto.ExpenseResponse;
import com.propertymanagement.modules.finance.revenue.dto.CreateRevenueRequest;
import com.propertymanagement.modules.finance.revenue.dto.OtherRevenueResponse;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.finance.export.ExportType;
import com.propertymanagement.modules.finance.service.FinanceExportService;
import com.propertymanagement.modules.finance.service.FinanceService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.LocalDate;

@RestController
@RequestMapping("/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService service;
    private final FinanceExportService financeExportService;

    @GetMapping("/dashboard")
    @RequiresPermission(module = "finance", action = "view")
    public ResponseEntity<ApiResponse<FinanceDashboardResponse>> dashboard(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboard(propertyId)));
    }

    @GetMapping("/expenses")
    @RequiresPermission(module = "finance", action = "view")
    public ResponseEntity<ApiResponse<Page<ExpenseResponse>>> expenses(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestHeader(name = "Accept-Language", required = false) String lang,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getExpenses(pageable, q, propertyId, lang)));
    }

    @GetMapping("/revenues")
    @RequiresPermission(module = "finance", action = "view")
    public ResponseEntity<ApiResponse<Page<OtherRevenueResponse>>> revenues(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestHeader(name = "Accept-Language", required = false) String lang,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getRevenues(pageable, q, propertyId, lang)));
    }

    @PostMapping("/expenses")
    @RequiresPermission(module = "finance", action = "create")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(
            @Valid @RequestBody CreateExpenseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createExpense(request)));
    }

    @PostMapping("/revenues")
    @RequiresPermission(module = "finance", action = "create")
    public ResponseEntity<ApiResponse<OtherRevenueResponse>> createRevenue(
            @Valid @RequestBody CreateRevenueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createRevenue(request)));
    }

    @GetMapping("/budgets")
    @RequiresPermission(module = "finance", action = "view")
    public ResponseEntity<ApiResponse<List<BudgetResponse>>> budgets(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getBudgets(propertyId)));
    }

    @GetMapping("/reports/pnl")
    @RequiresPermission(module = "finance", action = "export")
    public ResponseEntity<ApiResponse<List<FinancialReportRowResponse>>> pnl(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo) {
        return ResponseEntity.ok(ApiResponse.ok(service.getPnlReport(propertyId, yearFrom, yearTo)));
    }

    @GetMapping("/reports/cashflow")
    @RequiresPermission(module = "finance", action = "export")
    public ResponseEntity<ApiResponse<List<FinancialReportRowResponse>>> cashFlow(@RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCashFlowReport(propertyId)));
    }

    @GetMapping("/reports/owner-statements")
    @RequiresPermission(module = "finance", action = "export")
    public ResponseEntity<ApiResponse<List<FinancialReportRowResponse>>> ownerStatements(@RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getOwnerStatementReport(propertyId)));
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    @RequiresPermission(module = "finance", action = "view")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "ALL") ExportType type) {
        byte[] body = financeExportService.exportTransactions(from, to, type);
        String filename = "finance-export-" + type.name().toLowerCase() + "-" + from + "_" + to + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }
}
