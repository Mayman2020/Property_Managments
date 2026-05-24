package com.propertymanagement.modules.devops.controller;

import com.propertymanagement.modules.contract.scheduler.ContractScheduler;
import com.propertymanagement.modules.ownerportal.service.OwnerStatementGenerationService;
import com.propertymanagement.modules.scheduler.OperationalScheduler;
import com.propertymanagement.modules.finance.service.FinanceExportService;
import com.propertymanagement.modules.vacancy.service.VacancyPublishingService;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;

/**
 * Manual triggers for scheduled jobs — useful for QA and demos.
 * Available in all profiles; restricted to SUPER_ADMIN.
 */
@RestController
@RequestMapping("/dev/schedulers")
@RequiredArgsConstructor
public class DevSchedulerController {

    private final ContractScheduler contractScheduler;
    private final OperationalScheduler operationalScheduler;
    private final OwnerStatementGenerationService ownerStatementGenerationService;
    private final FinanceExportService financeExportService;
    private final VacancyPublishingService vacancyPublishingService;

    @PostMapping("/rent-overdue")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runOverdueCheck() {
        contractScheduler.checkOverduePayments();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkOverduePayments", "status", "ok")));
    }

    @PostMapping("/rent-due-reminders")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runRentDueReminders() {
        contractScheduler.checkUpcomingRentDueReminders();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkUpcomingRentDueReminders", "status", "ok")));
    }

    @PostMapping("/contract-expiring")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runExpiringContracts() {
        contractScheduler.checkExpiringContracts();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkExpiringContracts", "status", "ok")));
    }

    @PostMapping("/contract-expiring-reminders")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runExpiringReminders() {
        contractScheduler.checkContractsExpiringIn3Days();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkContractsExpiringIn3Days", "status", "ok")));
    }

    @PostMapping("/maintenance-invoice-reminders")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runMaintenanceInvoiceReminders() {
        contractScheduler.checkUpcomingMaintenanceInvoiceInstallments();
        contractScheduler.checkMaintenanceInvoiceInstallmentsDueToday();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "maintenanceInvoiceReminders", "status", "ok")));
    }

    @PostMapping("/rent-dunning-escalation")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runRentDunningEscalation() {
        contractScheduler.checkRentDunningEscalation();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkRentDunningEscalation", "status", "ok")));
    }

    @PostMapping("/maintenance-sla")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runMaintenanceSla() {
        operationalScheduler.checkMaintenanceRequestOverdue();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkMaintenanceRequestOverdue", "status", "ok")));
    }

    @PostMapping("/maintenance-overdue")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runMaintenanceOverdue() {
        operationalScheduler.checkMaintenanceRequestOverdue();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkMaintenanceRequestOverdue", "status", "ok")));
    }

    @PostMapping("/document-expiry")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runDocumentExpiry() {
        operationalScheduler.checkDocumentExpiry();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkDocumentExpiry", "status", "ok")));
    }

    @PostMapping("/low-stock")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runLowStock() {
        operationalScheduler.checkLowStock();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkLowStock", "status", "ok")));
    }

    @PostMapping("/leave-balance-low")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runLeaveBalanceLow() {
        operationalScheduler.checkLeaveBalanceLow();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "checkLeaveBalanceLow", "status", "ok")));
    }

    @PostMapping("/vacancy-auto-publish")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runVacancyAutoPublish() {
        Map<String, Object> result = vacancyPublishingService.backfillAll();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "job", "vacancyAutoPublish",
                "status", "ok",
                "result", result)));
    }

    @PostMapping("/finance-export-test")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runFinanceExportTest(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        YearMonth target = (year != null && month != null)
                ? YearMonth.of(year, month)
                : YearMonth.now();
        LocalDate from = target.atDay(1);
        LocalDate to = target.atEndOfMonth();
        Map<String, Integer> counts = financeExportService.countExportRows(from, to);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "job", "financeExportTest",
                "from", from.toString(),
                "to", to.toString(),
                "counts", counts,
                "status", "ok")));
    }

    @PostMapping("/owner-statements")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runOwnerStatements(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        YearMonth target = (year != null && month != null)
                ? YearMonth.of(year, month)
                : YearMonth.now().minusMonths(1);
        int count = ownerStatementGenerationService.generateForMonth(target.getYear(), target.getMonthValue());
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "job", "generateOwnerStatements",
                "year", target.getYear(),
                "month", target.getMonthValue(),
                "count", count,
                "status", "ok")));
    }

    @PostMapping("/run-all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> runAll() {
        contractScheduler.checkOverduePayments();
        contractScheduler.checkRentDunningEscalation();
        contractScheduler.checkExpiringContracts();
        contractScheduler.checkUpcomingRentDueReminders();
        contractScheduler.checkContractsExpiringIn3Days();
        contractScheduler.checkUpcomingMaintenanceInvoiceInstallments();
        contractScheduler.checkMaintenanceInvoiceInstallmentsDueToday();
        operationalScheduler.checkMaintenanceRequestOverdue();
        operationalScheduler.checkDocumentExpiry();
        operationalScheduler.checkLowStock();
        operationalScheduler.checkLeaveBalanceLow();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("job", "all", "status", "ok")));
    }
}
