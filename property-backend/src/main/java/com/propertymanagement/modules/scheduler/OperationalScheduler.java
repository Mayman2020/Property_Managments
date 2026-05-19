package com.propertymanagement.modules.scheduler;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.leave.repository.LeaveRequestRepository;
import com.propertymanagement.modules.inventory.entity.InventoryItemEntity;
import com.propertymanagement.modules.inventory.repository.InventoryRepository;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
@Slf4j
public class OperationalScheduler {

    private static final int LEAVE_LOW_THRESHOLD_DAYS = 5;
    private static final int GRACE_PERIOD_DAYS = 3;

    private final InventoryRepository inventoryRepo;
    private final LeaveRequestRepository leaveRepo;
    private final EmployeeRepository employeeRepo;
    private final LeaseContractRepository contractRepo;
    private final RentPaymentScheduleRepository scheduleRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    /** Daily 8:00 AM — alert managers for any inventory item below minQuantity. */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void checkLowStock() {
        List<InventoryItemEntity> lowItems = inventoryRepo.findLowStock();
        if (lowItems.isEmpty()) return;

        for (InventoryItemEntity item : lowItems) {
            if (item.getPropertyId() == null) continue;
            List<Long> recipients = accountantsOf(item.getPropertyId());
            if (recipients.isEmpty()) continue;
            String name = item.getItemNameAr() != null ? item.getItemNameAr() : item.getItemNameEn();
            notificationService.createForRecipients(
                    recipients,
                    null,
                    item.getPropertyId(),
                    item.getId(),
                    NotificationType.INVENTORY_LOW_STOCK,
                    "مخزون منخفض",
                    "الصنف «" + name + "» وصل للحد الأدنى (الكمية: " + item.getQuantity() + ")"
            );
        }
        log.info("Low-stock check: {} items below minimum", lowItems.size());
    }

    /** Daily 8:30 AM — notify employees whose leave balance ≤ 5 days remaining. */
    @Scheduled(cron = "0 30 8 * * *")
    @Transactional
    public void checkLeaveBalanceLow() {
        int year = Year.now().getValue();
        List<Employee> employees = employeeRepo.findAll();
        int notified = 0;

        for (Employee emp : employees) {
            if (emp.getLinkedUserId() == null) continue;
            int used = leaveRepo.sumApprovedDaysByEmployeeAndYear(emp.getId(), year);
            int remaining = Math.max(0, 30 - used);
            if (remaining <= LEAVE_LOW_THRESHOLD_DAYS && remaining > 0) {
                notificationService.createForRecipients(
                        List.of(emp.getLinkedUserId()),
                        null,
                        emp.getPropertyId(),
                        emp.getId(),
                        NotificationType.LEAVE_BALANCE_LOW,
                        "رصيد إجازتك منخفض",
                        "تبقى لك " + remaining + " يوم من رصيد إجازتك السنوية لهذا العام"
                );
                notified++;
            }
        }
        log.info("Leave-balance check: {} employees notified", notified);
    }

    /** Daily 9:30 AM — send RENT_GRACE_PERIOD_ENDING for payments overdue ≥ 3 days. */
    @Scheduled(cron = "0 30 9 * * *")
    @Transactional
    public void checkRentGracePeriod() {
        LocalDate graceCutoff = LocalDate.now().minusDays(GRACE_PERIOD_DAYS);
        scheduleRepo.findByStatusAndDueDate(PaymentScheduleStatus.OVERDUE, graceCutoff)
                .forEach(schedule -> contractRepo.findById(schedule.getContractId())
                        .filter(c -> c.getStatus() == ContractStatus.ACTIVE)
                        .ifPresent(contract -> {
                            List<Long> recipients = accountantsOf(contract.getPropertyId());
                            notificationService.createForRecipients(
                                    recipients,
                                    null,
                                    contract.getPropertyId(),
                                    contract.getId(),
                                    NotificationType.RENT_GRACE_PERIOD_ENDING,
                                    "تنبيه: إيجار متأخر",
                                    "العقد رقم " + contract.getContractNumber() + " لم يُسدَّد الإيجار منذ " + GRACE_PERIOD_DAYS + " أيام"
                            );
                        }));
    }

    private List<Long> accountantsOf(Long propertyId) {
        return userRepo.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT)
                .stream().map(User::getId).toList();
    }
}
