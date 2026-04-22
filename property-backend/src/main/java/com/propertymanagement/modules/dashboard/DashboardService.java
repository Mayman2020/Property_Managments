package com.propertymanagement.modules.dashboard;

import com.propertymanagement.modules.inventory.InventoryRepository;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.RequestStatus;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
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
        LocalDateTime since = LocalDateTime.now().minusMonths(6)
                .withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return requestRepository.countByMonth(since).stream()
                .map(row -> {
                    String label = row[0] + "-" + String.format("%02d", ((Number) row[1]).intValue());
                    long count = ((Number) row[2]).longValue();
                    return new ChartDataPoint(label, count);
                })
                .collect(Collectors.toList());
    }

    public DashboardStatsResponse getStatsByProperty(Long propertyId) {
        Map<String, Long> requestsByStatus = new HashMap<>();
        List<Object[]> statusGrouped = requestRepository.countByStatusGrouped();
        for (Object[] row : statusGrouped) {
            requestsByStatus.put(row[0].toString(), (Long) row[1]);
        }

        Map<String, Long> requestsByCategory = new HashMap<>();
        List<Object[]> grouped = requestRepository.countByCategoryForProperty(propertyId);
        for (Object[] row : grouped) {
            requestsByCategory.put(String.valueOf(row[0]), (Long) row[1]);
        }

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);

        return DashboardStatsResponse.builder()
                .totalUnits(unitRepository.countAllActive())
                .rentedUnits(unitRepository.countRented())
                .vacantUnits(unitRepository.countVacant())
                .pendingRequests(requestRepository.countByPropertyIdAndStatus(propertyId, RequestStatus.PENDING))
                .inProgressRequests(requestRepository.countByPropertyIdAndStatus(propertyId, RequestStatus.IN_PROGRESS))
                .completedThisMonth(requestRepository.countCompletedSince(startOfMonth))
                .lowStockItems(inventoryRepository.countLowStock())
                .requestsByStatus(requestsByStatus)
                .requestsByCategory(requestsByCategory)
                .build();
    }
}
