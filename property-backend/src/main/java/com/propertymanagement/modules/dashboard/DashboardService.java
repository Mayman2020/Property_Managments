package com.propertymanagement.modules.dashboard;

import com.propertymanagement.modules.complaint.TenantComplaintRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.dto.ContractSummaryDto;
import com.propertymanagement.modules.contract.payment.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.RentPaymentScheduleRepository;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.inventory.InventoryRepository;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.RequestStatus;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.violation.TenantViolationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final TenantViolationRepository violationRepository;
    private final TenantComplaintRepository complaintRepository;

    public DashboardStatsResponse getStats() {
        Map<String, Long> requestsByStatus = new HashMap<>();
        List<Object[]> grouped = requestRepository.countByStatusGrouped();
        for (Object[] row : grouped) {
            requestsByStatus.put(row[0].toString(), (Long) row[1]);
        }
        Map<String, Long> requestsByCategory = new HashMap<>();

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);

        return DashboardStatsResponse.builder()
                .totalProperties(propertyRepository.countActive())
                .totalUnits(unitRepository.countAllActive())
                .rentedUnits(unitRepository.countRented())
                .vacantUnits(unitRepository.countVacant())
                .pendingRequests(requestRepository.countByStatus(RequestStatus.PENDING))
                .inProgressRequests(requestRepository.countByStatus(RequestStatus.IN_PROGRESS))
                .completedThisMonth(requestRepository.countCompletedSince(startOfMonth))
                .lowStockItems(inventoryRepository.countLowStock())
                .openMaintenanceRequests(requestRepository.countOpenExcludingTerminal())
                .totalInventoryItems(inventoryRepository.countByActiveTrue())
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
                .activeContracts(contractRepository.countActive())
                .expiringIn30Days(contractRepository.countExpiringBefore(LocalDate.now().plusDays(30)))
                .overduePayments(scheduleRepository.countOverdue())
                .openViolations(violationRepository.countOpen())
                .openComplaints(complaintRepository.countOpen())
                .build();
    }

    public List<ChartDataPoint> getRequestsByStatus() {
        return requestRepository.countByStatusGrouped().stream()
                .map(row -> new ChartDataPoint(row[0].toString(), (Long) row[1]))
                .collect(Collectors.toList());
    }

    public List<ChartDataPoint> getRequestsByCategory() {
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
        return contractRepository.findExpiringBetween(LocalDate.now(), cutoff).stream()
                .map(c -> ContractSummaryDto.builder()
                        .id(c.getId())
                        .contractNumber(c.getContractNumber())
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
        return scheduleRepository.findByStatusAndDueDateBefore(PaymentScheduleStatus.OVERDUE, LocalDate.now().plusDays(1))
                .stream()
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
        long vacantUnits = Math.max(0, totalUnits - rentedUnits);

        return DashboardStatsResponse.builder()
                .totalProperties(1)
                .totalUnits(totalUnits)
                .rentedUnits(rentedUnits)
                .vacantUnits(vacantUnits)
                .pendingRequests(requestRepository.countByPropertyIdAndStatus(propertyId, RequestStatus.PENDING))
                .inProgressRequests(requestRepository.countByPropertyIdAndStatus(propertyId, RequestStatus.IN_PROGRESS))
                .completedThisMonth(requestRepository.countCompletedSinceForProperty(startOfMonth, propertyId))
                .lowStockItems(inventoryRepository.countLowStockByProperty(propertyId))
                .openMaintenanceRequests(requestRepository.countOpenExcludingTerminalForProperty(propertyId))
                .totalInventoryItems(inventoryRepository.countByPropertyIdAndActiveTrue(propertyId))
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
                .activeContracts(contractRepository.countActiveByProperty(propertyId))
                .expiringIn30Days(contractRepository.countExpiringBeforeByProperty(propertyId, LocalDate.now().plusDays(30)))
                .overduePayments(scheduleRepository.countOverdueByProperty(propertyId))
                .openViolations(violationRepository.countOpenByProperty(propertyId))
                .openComplaints(complaintRepository.countOpenByProperty(propertyId))
                .build();
    }
}
