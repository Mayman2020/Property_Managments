package com.propertymanagement.modules.reports.service;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.finance.budget.repository.BudgetQueryRepository;
import com.propertymanagement.modules.finance.expense.repository.ExpenseRepository;
import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.reports.dto.*;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportsService {

    private final LeaseContractRepository contractRepo;
    private final UnitRepository unitRepo;
    private final PropertyRepository propertyRepo;
    private final TenantRepository tenantRepo;
    private final MaintenanceRequestRepository maintenanceRepo;
    private final BudgetQueryRepository budgetRepo;
    private final ExpenseRepository expenseRepo;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    // ─── Contract Expiry Report ───────────────────────────────────────────────

    public List<ContractExpiryRow> getExpiringContracts(int daysAhead, Long propertyId) {
        LocalDate today = LocalDate.now();
        LocalDate cutoff = today.plusDays(daysAhead);

        List<LeaseContract> contracts = contractRepo.findExpiringBetween(today, cutoff);

        Set<Long> scope = resolvePropertyScope();
        if (scope != null) {
            contracts = contracts.stream()
                    .filter(c -> scope.contains(c.getPropertyId()))
                    .collect(Collectors.toList());
        }
        if (propertyId != null) {
            contracts = contracts.stream()
                    .filter(c -> propertyId.equals(c.getPropertyId()))
                    .collect(Collectors.toList());
        }

        Map<Long, String> propertyNames = buildPropertyNameMap();
        Map<Long, String> unitNumbers = buildUnitNumberMap();
        Map<Long, String> tenantNames = buildTenantNameMap();

        return contracts.stream()
                .sorted(Comparator.comparing(LeaseContract::getEndDate))
                .map(c -> ContractExpiryRow.builder()
                        .contractId(c.getId())
                        .contractNumber(c.getContractNumber())
                        .propertyId(c.getPropertyId())
                        .propertyName(propertyNames.getOrDefault(c.getPropertyId(), "-"))
                        .unitId(c.getUnitId())
                        .unitNumber(unitNumbers.getOrDefault(c.getUnitId(), "-"))
                        .tenantId(c.getTenantId())
                        .tenantName(tenantNames.getOrDefault(c.getTenantId(), "-"))
                        .startDate(c.getStartDate())
                        .endDate(c.getEndDate())
                        .daysRemaining(ChronoUnit.DAYS.between(today, c.getEndDate()))
                        .monthlyRent(c.getMonthlyRent())
                        .status(c.getStatus().name())
                        .build())
                .toList();
    }

    // ─── Occupancy Analytics ─────────────────────────────────────────────────

    public OccupancyAnalyticsResponse getOccupancyAnalytics(Long propertyId) {
        Set<Long> scope = resolvePropertyScope();

        List<Long> propertyIds;
        if (propertyId != null) {
            propertyIds = List.of(propertyId);
        } else if (scope != null) {
            propertyIds = new ArrayList<>(scope);
        } else {
            propertyIds = propertyRepo.findAll().stream().map(p -> p.getId()).toList();
        }

        Map<Long, String> propertyNames = buildPropertyNameMap();

        List<OccupancyAnalyticsResponse.PropertyOccupancy> byProperty = new ArrayList<>();
        int totalUnits = 0;
        int rentedUnits = 0;
        BigDecimal totalRent = BigDecimal.ZERO;

        for (Long pId : propertyIds) {
            int units = unitRepo.findByPropertyIdAndActiveTrue(pId).size();
            long rented = contractRepo.countActiveByProperty(pId);
            List<LeaseContract> activeContracts = contractRepo.findAll().stream()
                    .filter(c -> c.getStatus() == ContractStatus.ACTIVE && pId.equals(c.getPropertyId()))
                    .toList();
            BigDecimal propRent = activeContracts.stream()
                    .map(c -> c.getMonthlyRent() != null ? c.getMonthlyRent() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            double rate = units > 0 ? (double) rented / units * 100 : 0;
            byProperty.add(OccupancyAnalyticsResponse.PropertyOccupancy.builder()
                    .propertyId(pId)
                    .propertyName(propertyNames.getOrDefault(pId, "-"))
                    .totalUnits(units)
                    .rentedUnits((int) rented)
                    .occupancyRate(round(rate))
                    .totalMonthlyRent(propRent)
                    .build());

            totalUnits += units;
            rentedUnits += (int) rented;
            totalRent = totalRent.add(propRent);
        }

        double globalRate = totalUnits > 0 ? (double) rentedUnits / totalUnits * 100 : 0;
        BigDecimal avgRent = rentedUnits > 0 ? totalRent.divide(BigDecimal.valueOf(rentedUnits), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        return OccupancyAnalyticsResponse.builder()
                .totalUnits(totalUnits)
                .rentedUnits(rentedUnits)
                .vacantUnits(totalUnits - rentedUnits)
                .occupancyRate(round(globalRate))
                .totalMonthlyRent(totalRent)
                .averageMonthlyRent(avgRent)
                .byProperty(byProperty)
                .build();
    }

    // ─── Maintenance Report ──────────────────────────────────────────────────

    public MaintenanceReportResponse getMaintenanceReport(Long propertyId) {
        Set<Long> scope = resolvePropertyScope();
        if (scope != null && propertyId != null && !scope.contains(propertyId)) {
            return emptyMaintenanceReport();
        }

        List<MaintenanceRequest> requests = loadMaintenanceRequests(propertyId, scope);
        Map<String, Long> byStatus = requests.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getStatus() != null ? r.getStatus().name() : "UNKNOWN",
                        LinkedHashMap::new,
                        Collectors.counting()));

        List<MaintenanceReportResponse.RequestSummary> summaries = requests.stream()
                .map(this::maintenanceSummary)
                .toList();

        return buildMaintenanceReport(byStatus, summaries);
    }

    private List<MaintenanceRequest> loadMaintenanceRequests(Long propertyId, Set<Long> scope) {
        if (propertyId != null) {
            return maintenanceRepo.findFiltered(null, null, propertyId, Pageable.unpaged()).getContent();
        }
        if (scope != null) {
            if (scope.isEmpty()) return List.of();
            return maintenanceRepo.findFilteredForPropertyIds(null, null, scope, Pageable.unpaged()).getContent();
        }
        return maintenanceRepo.findFiltered(null, null, null, Pageable.unpaged()).getContent();
    }

    private MaintenanceReportResponse buildMaintenanceReport(
            Map<String, Long> byStatus,
            List<MaintenanceReportResponse.RequestSummary> requests) {
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long open = byStatus.getOrDefault("OPEN", 0L);
        long inProgress = byStatus.getOrDefault("IN_PROGRESS", 0L)
                + byStatus.getOrDefault("ASSIGNED", 0L)
                + byStatus.getOrDefault("SCHEDULED", 0L);
        long completed = byStatus.getOrDefault("COMPLETED", 0L);
        long cancelled = byStatus.getOrDefault("CANCELLED", 0L);

        List<MaintenanceReportResponse.StatusBreakdown> statusList = byStatus.entrySet().stream()
                .map(e -> MaintenanceReportResponse.StatusBreakdown.builder()
                        .status(e.getKey()).count(e.getValue()).build())
                .toList();

        return MaintenanceReportResponse.builder()
                .totalRequests(total)
                .openRequests(open)
                .inProgressRequests(inProgress)
                .completedRequests(completed)
                .cancelledRequests(cancelled)
                .overdueRequests(0L)
                .totalInvoicedAmount(BigDecimal.ZERO)
                .byStatus(statusList)
                .byCategory(List.of())
                .requests(requests)
                .build();
    }

    private MaintenanceReportResponse emptyMaintenanceReport() {
        return buildMaintenanceReport(new LinkedHashMap<>(), List.of());
    }

    private MaintenanceReportResponse.RequestSummary maintenanceSummary(MaintenanceRequest request) {
        Property property = request.getPropertyId() == null
                ? null
                : propertyRepo.findById(request.getPropertyId()).orElse(null);
        Unit unit = request.getUnitId() == null
                ? null
                : unitRepo.findById(request.getUnitId()).orElse(null);
        Tenant tenant = request.getTenantId() == null
                ? null
                : tenantRepo.findById(request.getTenantId()).orElse(null);

        return MaintenanceReportResponse.RequestSummary.builder()
                .id(request.getId())
                .requestNumber(request.getRequestNumber())
                .title(request.getTitle())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus().name() : null)
                .priority(request.getPriority() != null ? request.getPriority().name() : null)
                .propertyId(request.getPropertyId())
                .propertyName(property != null ? property.getPropertyName() : null)
                .propertyNameAr(property != null ? property.getPropertyNameAr() : null)
                .propertyNameEn(property != null ? property.getPropertyNameEn() : null)
                .unitId(request.getUnitId())
                .unitNumber(unit != null ? unit.getUnitNumber() : null)
                .tenantId(request.getTenantId())
                .tenantName(tenant != null ? tenant.getFullName() : null)
                .tenantNameAr(tenant != null ? tenant.getFullNameAr() : null)
                .tenantNameEn(tenant != null ? tenant.getFullNameEn() : null)
                .assignedTo(request.getAssignedTo())
                .scheduledDate(request.getScheduledDate())
                .scheduledTimeFrom(request.getScheduledTimeFrom())
                .scheduledTimeTo(request.getScheduledTimeTo())
                .slaDeadline(request.getSlaDeadline())
                .slaBreached(request.isSlaBreached())
                .createdAt(request.getCreatedAt())
                .build();
    }

    // ─── Budget vs Actual ────────────────────────────────────────────────────

    public BudgetVsActualResponse getBudgetVsActual(Long propertyId, Integer year) {
        List<BudgetQueryRepository.BudgetRow> budgetRows = propertyId != null
                ? budgetRepo.findAllRowsByProperty(propertyId)
                : budgetRepo.findAllRows();

        Set<Long> scope = resolvePropertyScope();
        if (scope != null) {
            budgetRows = budgetRows.stream()
                    .filter(r -> scope.contains(r.getPropertyId()))
                    .toList();
        }

        BigDecimal totalBudgeted = BigDecimal.ZERO;
        BigDecimal totalActual = BigDecimal.ZERO;
        List<BudgetVsActualResponse.CategoryRow> rows = new ArrayList<>();

        for (BudgetQueryRepository.BudgetRow row : budgetRows) {
            BigDecimal budgeted = row.getBudgetedAmount() != null ? row.getBudgetedAmount() : BigDecimal.ZERO;
            // Actual expenses for same property would need a category-scoped query;
            // using zero as placeholder until category_id link is wired in BudgetEntity.
            BigDecimal actual = BigDecimal.ZERO;
            BigDecimal variance = budgeted.subtract(actual);
            double utilization = budgeted.compareTo(BigDecimal.ZERO) > 0
                    ? actual.divide(budgeted, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                    : 0.0;

            rows.add(BudgetVsActualResponse.CategoryRow.builder()
                    .budgetId(row.getId())
                    .propertyId(row.getPropertyId())
                    .categoryName(row.getCategoryName())
                    .budgetedAmount(budgeted)
                    .actualAmount(actual)
                    .variance(variance)
                    .utilizationPercent(round(utilization))
                    .overBudget(actual.compareTo(budgeted) > 0)
                    .build());

            totalBudgeted = totalBudgeted.add(budgeted);
            totalActual = totalActual.add(actual);
        }

        BigDecimal totalVariance = totalBudgeted.subtract(totalActual);
        double globalUtil = totalBudgeted.compareTo(BigDecimal.ZERO) > 0
                ? totalActual.divide(totalBudgeted, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;

        return BudgetVsActualResponse.builder()
                .totalBudgeted(totalBudgeted)
                .totalActual(totalActual)
                .totalVariance(totalVariance)
                .utilizationPercent(round(globalUtil))
                .rows(rows)
                .build();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Set<Long> resolvePropertyScope() {
        return ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
    }

    private Map<Long, String> buildPropertyNameMap() {
        Map<Long, String> map = new HashMap<>();
        propertyRepo.findAll().forEach(p -> {
            String name = p.getPropertyNameAr() != null && !p.getPropertyNameAr().isBlank() ? p.getPropertyNameAr()
                    : (p.getPropertyNameEn() != null ? p.getPropertyNameEn() : p.getPropertyName());
            map.put(p.getId(), name);
        });
        return map;
    }

    private Map<Long, String> buildUnitNumberMap() {
        Map<Long, String> map = new HashMap<>();
        unitRepo.findAll().forEach(u -> map.put(u.getId(), u.getUnitNumber()));
        return map;
    }

    private Map<Long, String> buildTenantNameMap() {
        Map<Long, String> map = new HashMap<>();
        tenantRepo.findAll().forEach(t -> {
            String name = t.getFullNameAr() != null && !t.getFullNameAr().isBlank() ? t.getFullNameAr()
                    : (t.getFullNameEn() != null ? t.getFullNameEn() : t.getFullName());
            map.put(t.getId(), name);
        });
        return map;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
