package com.propertymanagement.modules.dashboard;

import com.propertymanagement.modules.complaint.TenantComplaintRepository;
import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.dto.ContractSummaryDto;
import com.propertymanagement.modules.contract.payment.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.RentPaymentScheduleRepository;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.inventory.InventoryRepository;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.RequestStatus;
import com.propertymanagement.modules.owner.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final MaintenanceRequestRepository requestRepository;
    private final InventoryRepository inventoryRepository;
    private final LeaseContractRepository contractRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final TenantComplaintRepository complaintRepository;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public DashboardStatsResponse getStats() {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return emptyDashboardStats();
            }
            List<Long> ids = new ArrayList<>(ownerScope);
            Collections.sort(ids);
            return aggregateStatsForPropertyIds(ids);
        }

        Map<String, Long> requestsByStatus = new HashMap<>();
        List<Object[]> grouped = requestRepository.countByStatusGrouped();
        for (Object[] row : grouped) {
            requestsByStatus.put(row[0].toString(), (Long) row[1]);
        }
        Map<String, Long> requestsByCategory = new HashMap<>();

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);

        long vacant = unitRepository.countVacant();
        long reserved = unitRepository.countReserved();
        long rented = unitRepository.countRented();

        return DashboardStatsResponse.builder()
                .totalProperties(propertyRepository.countActive())
                .totalUnits(unitRepository.countAllActive())
                .rentedUnits(rented)
                .reservedUnits(reserved)
                .vacantUnits(vacant)
                .unrentedUnits(vacant + reserved)
                .pendingRequests(requestRepository.countByStatus(RequestStatus.PENDING))
                .inProgressRequests(requestRepository.countByStatus(RequestStatus.IN_PROGRESS))
                .completedThisMonth(requestRepository.countCompletedSince(startOfMonth))
                .lowStockItems(inventoryRepository.countLowStock())
                .openMaintenanceRequests(requestRepository.countOpenExcludingTerminal())
                .totalInventoryItems(inventoryRepository.countByActiveTrue())
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
                .activeContracts(contractRepository.countActive())
                .draftContracts(contractRepository.countByStatus(ContractStatus.DRAFT))
                .pendingOwnerContracts(contractRepository.countByStatus(ContractStatus.PENDING_OWNER_APPROVAL))
                .cancelledContracts(contractRepository.countByStatus(ContractStatus.CANCELLED))
                .expiringIn30Days(contractRepository.countExpiringBefore(LocalDate.now().plusDays(30)))
                .overduePayments(scheduleRepository.countOverdue())
                .openComplaints(complaintRepository.countOpen())
                .build();
    }

    private DashboardStatsResponse emptyDashboardStats() {
        return DashboardStatsResponse.builder()
                .totalProperties(0)
                .totalUnits(0)
                .rentedUnits(0)
                .reservedUnits(0)
                .vacantUnits(0)
                .unrentedUnits(0)
                .pendingRequests(0)
                .inProgressRequests(0)
                .completedThisMonth(0)
                .lowStockItems(0)
                .openMaintenanceRequests(0)
                .totalInventoryItems(0)
                .requestsByStatus(new HashMap<>())
                .requestsByCategory(new HashMap<>())
                .activeContracts(0)
                .draftContracts(0)
                .pendingOwnerContracts(0)
                .cancelledContracts(0)
                .expiringIn30Days(0)
                .overduePayments(0)
                .openComplaints(0)
                .build();
    }

    private DashboardStatsResponse aggregateStatsForPropertyIds(List<Long> propertyIds) {
        long totalUnits = 0;
        long rentedUnits = 0;
        long reservedUnits = 0;
        long vacantUnits = 0;
        long unrentedUnits = 0;
        long pendingRequests = 0;
        long inProgressRequests = 0;
        long completedThisMonth = 0;
        long lowStockItems = 0;
        long openMaintenanceRequests = 0;
        long totalInventoryItems = 0;
        long activeContracts = 0;
        long draftContracts = 0;
        long pendingOwnerContracts = 0;
        long cancelledContracts = 0;
        long expiringIn30Days = 0;
        long overduePayments = 0;
        long openComplaints = 0;
        Map<String, Long> requestsByStatus = new HashMap<>();
        Map<String, Long> requestsByCategory = new HashMap<>();

        for (Long propertyId : propertyIds) {
            DashboardStatsResponse s = getStatsByProperty(propertyId);
            totalUnits += s.getTotalUnits();
            rentedUnits += s.getRentedUnits();
            reservedUnits += s.getReservedUnits();
            vacantUnits += s.getVacantUnits();
            unrentedUnits += s.getUnrentedUnits();
            pendingRequests += s.getPendingRequests();
            inProgressRequests += s.getInProgressRequests();
            completedThisMonth += s.getCompletedThisMonth();
            lowStockItems += s.getLowStockItems();
            openMaintenanceRequests += s.getOpenMaintenanceRequests();
            totalInventoryItems += s.getTotalInventoryItems();
            activeContracts += s.getActiveContracts();
            draftContracts += s.getDraftContracts();
            pendingOwnerContracts += s.getPendingOwnerContracts();
            cancelledContracts += s.getCancelledContracts();
            expiringIn30Days += s.getExpiringIn30Days();
            overduePayments += s.getOverduePayments();
            openComplaints += s.getOpenComplaints();
            mergeCountMap(requestsByStatus, s.getRequestsByStatus());
            mergeCountMap(requestsByCategory, s.getRequestsByCategory());
        }

        return DashboardStatsResponse.builder()
                .totalProperties(propertyIds.size())
                .totalUnits(totalUnits)
                .rentedUnits(rentedUnits)
                .reservedUnits(reservedUnits)
                .vacantUnits(vacantUnits)
                .unrentedUnits(unrentedUnits)
                .pendingRequests(pendingRequests)
                .inProgressRequests(inProgressRequests)
                .completedThisMonth(completedThisMonth)
                .lowStockItems(lowStockItems)
                .openMaintenanceRequests(openMaintenanceRequests)
                .totalInventoryItems(totalInventoryItems)
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
                .activeContracts(activeContracts)
                .draftContracts(draftContracts)
                .pendingOwnerContracts(pendingOwnerContracts)
                .cancelledContracts(cancelledContracts)
                .expiringIn30Days(expiringIn30Days)
                .overduePayments(overduePayments)
                .openComplaints(openComplaints)
                .build();
    }

    private static void mergeCountMap(Map<String, Long> target, Map<String, Long> part) {
        if (part == null) {
            return;
        }
        for (Map.Entry<String, Long> e : part.entrySet()) {
            target.merge(e.getKey(), e.getValue(), Long::sum);
        }
    }

    public List<ChartDataPoint> getRequestsByStatus() {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return List.of();
            }
            Map<String, Long> merged = new HashMap<>();
            for (Long pid : ownerScope) {
                for (Object[] row : requestRepository.countByStatusGroupedForProperty(pid)) {
                    merged.merge(row[0].toString(), (Long) row[1], Long::sum);
                }
            }
            return merged.entrySet().stream()
                    .map(e -> new ChartDataPoint(e.getKey(), e.getValue()))
                    .collect(Collectors.toList());
        }
        return requestRepository.countByStatusGrouped().stream()
                .map(row -> new ChartDataPoint(row[0].toString(), (Long) row[1]))
                .collect(Collectors.toList());
    }

    public List<ChartDataPoint> getRequestsByCategory() {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return List.of();
            }
            Map<String, Long> merged = new HashMap<>();
            for (Long pid : ownerScope) {
                for (Object[] row : requestRepository.countByCategoryForProperty(pid)) {
                    merged.merge(String.valueOf(row[0]), (Long) row[1], Long::sum);
                }
            }
            return merged.entrySet().stream()
                    .map(e -> new ChartDataPoint(e.getKey(), e.getValue()))
                    .collect(Collectors.toList());
        }
        return requestRepository.countByCategoryGrouped().stream()
                .map(row -> new ChartDataPoint(String.valueOf(row[0]), (Long) row[1]))
                .collect(Collectors.toList());
    }

    public List<ChartDataPoint> getMonthlyTrend() {
        return getMonthlyTrendByProperty(null);
    }

    public List<ChartDataPoint> getMonthlyTrendByProperty(Long propertyId) {
        LocalDateTime since = LocalDateTime.now().minusMonths(6)
                .withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null && propertyId == null) {
            if (ownerScope.isEmpty()) {
                return List.of();
            }
            Map<String, Long> merged = new HashMap<>();
            for (Long pid : ownerScope) {
                for (Object[] row : requestRepository.countByMonthForProperty(since, pid)) {
                    String label = row[0] + "-" + String.format("%02d", ((Number) row[1]).intValue());
                    long count = ((Number) row[2]).longValue();
                    merged.merge(label, count, Long::sum);
                }
            }
            return merged.entrySet().stream()
                    .map(e -> new ChartDataPoint(e.getKey(), e.getValue()))
                    .collect(Collectors.toList());
        }
        List<Object[]> rows = propertyId == null
                ? requestRepository.countByMonth(since)
                : requestRepository.countByMonthForProperty(since, propertyId);

        return rows.stream()
                .map(row -> {
                    String label = row[0] + "-" + String.format("%02d", ((Number) row[1]).intValue());
                    long count = ((Number) row[2]).longValue();
                    return new ChartDataPoint(label, count);
                })
                .collect(Collectors.toList());
    }

    public List<ContractSummaryDto> getExpiringContracts(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        return contractRepository.findExpiringBetween(LocalDate.now(), cutoff).stream()
                .filter(c -> ownerScope == null
                        || (c.getPropertyId() != null && ownerScope.contains(c.getPropertyId())))
                .map(c -> ContractSummaryDto.builder()
                        .id(c.getId())
                        .contractNumber(c.getContractNumber())
                        .propertyId(c.getPropertyId())
                        .tenantId(c.getTenantId())
                        .startDate(c.getStartDate())
                        .endDate(c.getEndDate())
                        .monthlyRent(c.getMonthlyRent())
                        .currency(c.getCurrency())
                        .status(c.getStatus() != null ? c.getStatus().name() : null)
                        .daysUntilExpiry(java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate()))
                        .build())
                .collect(Collectors.toList());
    }

    public List<ScheduleItemResponse> getOverduePayments() {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        return scheduleRepository.findByStatusAndDueDateBefore(PaymentScheduleStatus.OVERDUE, LocalDate.now().plusDays(1))
                .stream()
                .filter(s -> ownerScope == null || contractRepository.findById(s.getContractId())
                        .map(c -> c.getPropertyId() != null && ownerScope.contains(c.getPropertyId()))
                        .orElse(false))
                .map(s -> ScheduleItemResponse.builder()
                        .id(s.getId())
                        .contractId(s.getContractId())
                        .dueDate(s.getDueDate())
                        .amount(s.getAmount())
                        .periodFrom(s.getPeriodFrom())
                        .periodTo(s.getPeriodTo())
                        .status(s.getStatus() != null ? s.getStatus().name() : null)
                        .daysOverdue(java.time.temporal.ChronoUnit.DAYS.between(s.getDueDate(), LocalDate.now()))
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public DashboardStatsResponse getStatsByProperty(Long propertyId) {
        Map<String, Long> requestsByStatus = new HashMap<>();
        List<Object[]> statusGrouped = requestRepository.countByStatusGroupedForProperty(propertyId);
        for (Object[] row : statusGrouped) {
            requestsByStatus.put(row[0].toString(), (Long) row[1]);
        }

        Map<String, Long> requestsByCategory = new HashMap<>();
        List<Object[]> grouped = requestRepository.countByCategoryForProperty(propertyId);
        for (Object[] row : grouped) {
            requestsByCategory.put(String.valueOf(row[0]), (Long) row[1]);
        }

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        long totalUnits = unitRepository.countByPropertyIdAndActiveTrue(propertyId);
        long rentedUnits = unitRepository.countByPropertyIdAndActiveTrueAndRentedTrue(propertyId);
        long reservedUnits = unitRepository.countReservedByPropertyId(propertyId);
        long vacantUnits = Math.max(0, totalUnits - rentedUnits - reservedUnits);
        long unrentedUnits = Math.max(0, totalUnits - rentedUnits);

        return DashboardStatsResponse.builder()
                .totalProperties(1)
                .totalUnits(totalUnits)
                .rentedUnits(rentedUnits)
                .reservedUnits(reservedUnits)
                .vacantUnits(vacantUnits)
                .unrentedUnits(unrentedUnits)
                .pendingRequests(requestRepository.countByPropertyIdAndStatus(propertyId, RequestStatus.PENDING))
                .inProgressRequests(requestRepository.countByPropertyIdAndStatus(propertyId, RequestStatus.IN_PROGRESS))
                .completedThisMonth(requestRepository.countCompletedSinceForProperty(startOfMonth, propertyId))
                .lowStockItems(inventoryRepository.countLowStockByProperty(propertyId))
                .openMaintenanceRequests(requestRepository.countOpenExcludingTerminalForProperty(propertyId))
                .totalInventoryItems(inventoryRepository.countByPropertyIdAndActiveTrue(propertyId))
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
                .activeContracts(contractRepository.countActiveByProperty(propertyId))
                .draftContracts(contractRepository.countByStatusAndPropertyId(ContractStatus.DRAFT, propertyId))
                .pendingOwnerContracts(contractRepository.countByStatusAndPropertyId(ContractStatus.PENDING_OWNER_APPROVAL, propertyId))
                .cancelledContracts(contractRepository.countByStatusAndPropertyId(ContractStatus.CANCELLED, propertyId))
                .expiringIn30Days(contractRepository.countExpiringBeforeByProperty(propertyId, LocalDate.now().plusDays(30)))
                .overduePayments(scheduleRepository.countOverdueByProperty(propertyId))
                .openComplaints(complaintRepository.countOpenByProperty(propertyId))
                .build();
    }
}
