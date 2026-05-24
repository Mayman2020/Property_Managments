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
import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.service.MaintenanceRequestService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.property.attachment.entity.PropertyAttachment;
import com.propertymanagement.modules.property.attachment.repository.PropertyAttachmentRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class OperationalScheduler {

    private static final int LEAVE_LOW_THRESHOLD_DAYS = 5;
    private static final int GRACE_PERIOD_DAYS = 3;
    private static final int DOCUMENT_EXPIRY_LOOKAHEAD_DAYS = 30;

    private final InventoryRepository inventoryRepo;
    private final LeaveRequestRepository leaveRepo;
    private final EmployeeRepository employeeRepo;
    private final LeaseContractRepository contractRepo;
    private final RentPaymentScheduleRepository scheduleRepo;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final MaintenanceRequestService maintenanceRequestService;
    private final PropertyAttachmentRepository propertyAttachmentRepository;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

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

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void checkDocumentExpiry() {
        LocalDate today = LocalDate.now();
        LocalDate horizon = today.plusDays(DOCUMENT_EXPIRY_LOOKAHEAD_DAYS);
        List<PropertyAttachment> expiring = propertyAttachmentRepository.findByExpiryDateBetween(today, horizon);
        int notified = 0;
        for (PropertyAttachment attachment : expiring) {
            if (attachment.getPropertyId() == null) {
                continue;
            }
            List<Long> recipients = propertyAdminIds(attachment.getPropertyId());
            if (recipients.isEmpty()) {
                continue;
            }
            notificationService.createForRecipients(
                    recipients,
                    null,
                    attachment.getPropertyId(),
                    attachment.getId(),
                    NotificationType.DOCUMENT_EXPIRY_WARNING,
                    "انتهاء مستند قريب",
                    "المستند «" + attachment.getOriginalName() + "» ينتهي في "
                            + attachment.getExpiryDate());
            notified++;
        }
        log.info("Document expiry warnings sent: {}", notified);
    }

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

    // PHASE2-DONE: TASK2 — SLA deadline enforcement
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkMaintenanceRequestOverdue() {
        LocalDateTime now = LocalDateTime.now();
        int notified = 0;
        int autoAssigned = 0;
        for (MaintenanceRequest request : maintenanceRequestRepository.findOpenPastSlaDeadline(now)) {
            if (request.getPropertyId() == null) {
                continue;
            }
            boolean firstBreach = !request.isSlaBreached();
            if (firstBreach) {
                request.setSlaBreached(true);
                maintenanceRequestRepository.save(request);
            }

            MaintenanceRequest current = request;
            if (request.getPriority() == RequestPriority.URGENT
                    && request.getAssignedTo() == null
                    && request.getCreatedAt() != null
                    && request.getCreatedAt().plusHours(1).isBefore(now)) {
                current = maintenanceRequestService.tryAutoAssignUrgentUnassigned(request);
                if (current.getAssignedTo() != null) {
                    autoAssigned++;
                }
            }

            List<Long> recipients = new ArrayList<>();
            if (current.getAssignedTo() != null) {
                recipients.add(current.getAssignedTo());
            }
            recipients.addAll(propertyAdminIds(current.getPropertyId()));
            if (current.getPriority() == RequestPriority.URGENT
                    && current.getSlaDeadline() != null
                    && current.getSlaDeadline().plusHours(1).isBefore(now)) {
                userRepo.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                        .map(User::getId).forEach(recipients::add);
            }
            recipients = recipients.stream().distinct().toList();
            if (recipients.isEmpty()) {
                continue;
            }
            long hoursOver = ChronoUnit.HOURS.between(current.getSlaDeadline(), now);
            notificationService.createForRecipients(
                    recipients,
                    null,
                    current.getPropertyId(),
                    current.getId(),
                    NotificationType.MAINTENANCE_REQUEST_OVERDUE,
                    "طلب صيانة متأخر",
                    "الطلب " + current.getRequestNumber() + " تجاوز مهلة SLA بـ " + hoursOver + " ساعة");
            notified++;
        }
        log.info("Maintenance SLA overdue: {} notifications, {} auto-assignments", notified, autoAssigned);
    }

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

    private List<Long> propertyAdminIds(Long propertyId) {
        Set<Long> ids = new LinkedHashSet<>();
        userRepo.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream().map(User::getId).forEach(ids::add);
        if (propertyId != null) {
            userRepo.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.GENERAL_MANAGER).stream()
                    .map(User::getId).forEach(ids::add);
        } else {
            userRepo.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                    .map(User::getId).forEach(ids::add);
        }
        return new ArrayList<>(ids);
    }
}
