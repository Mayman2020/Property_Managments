package com.propertymanagement.modules.ownerportal.service;

import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.ownerportal.repository.OwnerRevenueShareRepository;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.ownerportal.entity.OwnerStatement;
import com.propertymanagement.modules.ownerportal.repository.OwnerStatementRepository;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class OwnerStatementGenerationService {

    @PersistenceContext
    private EntityManager entityManager;

    private final OwnerStatementRepository ownerStatementRepository;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final OwnerRevenueShareRepository ownerRevenueShareRepository;
    private final OwnerRevenueShareService ownerRevenueShareService;
    private final PropertyRepository propertyRepository;
    private final OwnerRepository ownerRepository;
    private final NotificationService notificationService;

    /** First day of each month at 02:00 — generate statements for the previous calendar month. */
    @Scheduled(cron = "0 0 2 1 * *")
    @Transactional
    public void generateMonthlyStatements() {
        YearMonth previous = YearMonth.now().minusMonths(1);
        generateForMonth(previous.getYear(), previous.getMonthValue());
    }

    @Transactional
    public int generateForMonth(int year, int month) {
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        int upserted = 0;
        for (OwnerPropertyPair pair : distinctOwnerPropertyPairs()) {
            // PHASE2-DONE: TASK1 — statements use revenue shares
            BigDecimal revenue = ownerRevenueShareRepository.sumAmountByOwnerPropertyMonth(
                    pair.ownerId(), pair.propertyId(), year, month);
            BigDecimal propertyExpenses = expenseWriterRepository.sumAmountByPropertyBetween(
                    pair.propertyId(), monthStart, monthEnd);
            BigDecimal ownerPct = ownerRevenueShareService.ownershipPercentageFor(pair.propertyId(), pair.ownerId());
            BigDecimal expenses = propertyExpenses.multiply(ownerPct)
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal net = revenue.subtract(expenses);

            OwnerStatement statement = ownerStatementRepository
                    .findByOwnerIdAndPropertyIdAndStatementYearAndStatementMonth(
                            pair.ownerId(), pair.propertyId(), year, month)
                    .orElse(OwnerStatement.builder()
                            .ownerId(pair.ownerId())
                            .propertyId(pair.propertyId())
                            .statementYear(year)
                            .statementMonth(month)
                            .build());

            statement.setTotalRevenue(revenue);
            statement.setTotalExpenses(expenses);
            statement.setOwnerNetAmount(net);
            statement.setStatus("SENT");
            if (statement.getCreatedAt() == null) {
                statement.setCreatedAt(LocalDateTime.now());
            }
            OwnerStatement saved = ownerStatementRepository.save(statement);
            notifyOwnerStatement(saved);
            upserted++;
        }
        log.info("Owner statements generated for {}/{}: {} rows", year, month, upserted);
        return upserted;
    }

    // PHASE1-DONE: TASK1 OWNER_STATEMENT
    public void notifyOwnerStatement(OwnerStatement stmt) {
        if (stmt == null || stmt.getOwnerId() == null) {
            return;
        }
        ownerRepository.findById(stmt.getOwnerId()).map(Owner::getUserId).ifPresent(userId -> {
            String propertyName = propertyRepository.findById(stmt.getPropertyId())
                    .map(p -> p.getPropertyName())
                    .orElse("");
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("month", stmt.getStatementMonth());
            vars.put("year", stmt.getStatementYear());
            vars.put("propertyName", propertyName);
            Map<String, Object> hints = Map.of("statementId", stmt.getId());
            notificationService.createLocalized(
                    List.of(userId),
                    null,
                    stmt.getPropertyId(),
                    null,
                    NotificationType.OWNER_STATEMENT,
                    "NOTIFICATIONS.OWNER_STATEMENT_TITLE",
                    "NOTIFICATIONS.OWNER_STATEMENT_BODY",
                    vars,
                    hints);
        });
    }

    @SuppressWarnings("unchecked")
    private Set<OwnerPropertyPair> distinctOwnerPropertyPairs() {
        Set<OwnerPropertyPair> pairs = new HashSet<>();
        List<Object[]> fromLink = entityManager.createNativeQuery("""
                SELECT DISTINCT owner_id, property_id
                FROM property_mgmt.property_owners
                WHERE owner_id IS NOT NULL AND property_id IS NOT NULL
                """).getResultList();
        for (Object[] row : fromLink) {
            pairs.add(new OwnerPropertyPair(((Number) row[0]).longValue(), ((Number) row[1]).longValue()));
        }
        List<Object[]> fromProperty = entityManager.createNativeQuery("""
                SELECT DISTINCT owner_id, id
                FROM property_mgmt.properties
                WHERE owner_id IS NOT NULL AND is_active = TRUE
                """).getResultList();
        for (Object[] row : fromProperty) {
            pairs.add(new OwnerPropertyPair(((Number) row[0]).longValue(), ((Number) row[1]).longValue()));
        }
        return pairs;
    }

    private record OwnerPropertyPair(Long ownerId, Long propertyId) {}
}
