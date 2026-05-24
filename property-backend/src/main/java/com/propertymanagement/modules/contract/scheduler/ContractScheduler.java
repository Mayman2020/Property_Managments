package com.propertymanagement.modules.contract.scheduler;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.vacancy.service.VacancyPublishingService;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.contract.payment.service.RentPaymentService;
import com.propertymanagement.modules.maintenance.contractinvoice.service.MaintenanceContractInvoiceService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.config.LateFeeProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContractScheduler {

    private final RentPaymentScheduleRepository scheduleRepository;
    private final RentPaymentService rentPaymentService;
    private final LeaseContractRepository contractRepository;
    private final LeaseContractService leaseContractService;
    private final MaintenanceContractInvoiceService maintenanceContractInvoiceService;
    private final LateFeeProperties lateFeeProperties;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final VacancyPublishingService vacancyPublishingService;

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkOverduePayments() {
        log.info("Running overdue payment check...");
        LocalDate today = LocalDate.now();
        List<RentPaymentSchedule> pending = scheduleRepository
                .findByStatusAndDueDateBefore(PaymentScheduleStatus.PENDING, today);
        long marked = 0;
        for (RentPaymentSchedule s : pending) {
            boolean active = contractRepository.findById(s.getContractId())
                    .map(c -> c.getStatus() == ContractStatus.ACTIVE)
                    .orElse(false);
            if (!active) {
                continue;
            }
            s.setStatus(PaymentScheduleStatus.OVERDUE);
            scheduleRepository.save(s);
            marked++;
            // PHASE1-DONE: TASK1+3 — RENT_OVERDUE on first overdue day (due +1)
            rentPaymentService.notifyRentOverdue(s, BigDecimal.ZERO);
        }
        log.info("Marked {} payments as OVERDUE (ACTIVE contracts only)", marked);

        applyLateFeesAfterGrace(today);
    }

    // PHASE1-DONE: TASK2 — late fee after grace period on OVERDUE rows
    private void applyLateFeesAfterGrace(LocalDate today) {
        LocalDate graceCutoff = today.minusDays(lateFeeProperties.getGracePeriodDays());
        List<RentPaymentSchedule> overdue = scheduleRepository.findByStatusAndDueDateBefore(
                PaymentScheduleStatus.OVERDUE, graceCutoff.plusDays(1));
        int applied = 0;
        for (RentPaymentSchedule s : overdue) {
            if (s.getDueDate() == null || s.getDueDate().isAfter(graceCutoff)) {
                continue;
            }
            if (s.isLateFeeApplied()) {
                continue;
            }
            boolean active = contractRepository.findById(s.getContractId())
                    .map(c -> c.getStatus() == ContractStatus.ACTIVE)
                    .orElse(false);
            if (active) {
                rentPaymentService.applyLateFeeAccrual(s);
                applied++;
            }
        }
        if (applied > 0) {
            log.info("Applied late fee accrual on {} schedule rows", applied);
        }
    }

    // PHASE1-DONE: TASK3 — day +7 escalation to accountant + GM
    @Scheduled(cron = "0 15 9 * * *")
    @Transactional
    public void checkRentDunningEscalation() {
        LocalDate cutoff = LocalDate.now().minusDays(7);
        List<RentPaymentSchedule> severe = scheduleRepository.findByStatusAndDueDateBefore(
                PaymentScheduleStatus.OVERDUE, cutoff.plusDays(1));
        int sent = 0;
        for (RentPaymentSchedule schedule : severe) {
            if (schedule.getDueDate() == null || schedule.getDueDate().isAfter(cutoff)) {
                continue;
            }
            var contractOpt = contractRepository.findById(schedule.getContractId())
                    .filter(c -> c.getStatus() == ContractStatus.ACTIVE);
            if (contractOpt.isEmpty()) {
                continue;
            }
            LeaseContract contract = contractOpt.get();
            List<Long> recipients = collectEscalationRecipients(contract.getPropertyId());
            if (recipients.isEmpty()) {
                continue;
            }
            notificationService.createForRecipients(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    contract.getId(),
                    NotificationType.RENT_GRACE_PERIOD_ENDING,
                    "تصعيد: إيجار متأخر 7+ أيام",
                    "العقد " + contract.getContractNumber() + " — استحقاق " + schedule.getDueDate()
                            + " لم يُسدَّد بعد.");
            sent++;
        }
        log.info("Rent dunning escalation notifications: {}", sent);
    }

    private List<Long> collectEscalationRecipients(Long propertyId) {
        Set<Long> ids = new LinkedHashSet<>();
        userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream()
                .map(User::getId).forEach(ids::add);
        userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                .map(User::getId).forEach(ids::add);
        if (propertyId != null) {
            userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT).stream()
                    .map(User::getId).forEach(ids::add);
        }
        return new ArrayList<>(ids);
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkExpiringContracts() {
        log.info("Running expiring contract check...");
        LocalDate today = LocalDate.now();

        List<LeaseContract> expired = contractRepository.findByStatusAndEndDateBefore(
                ContractStatus.ACTIVE, today);
        Set<Long> unitIds = new HashSet<>();
        for (LeaseContract contract : expired) {
            contract.setStatus(ContractStatus.EXPIRED);
            LeaseContract saved = contractRepository.save(contract);
            leaseContractService.notifyContractExpired(saved);
            if (saved.getUnitId() != null) {
                unitIds.add(saved.getUnitId());
            }
            vacancyPublishingService.autoPublishFromContract(saved);
        }
        unitIds.forEach(leaseContractService::syncUnitRentedFromContracts);

        if (!expired.isEmpty()) {
            log.info("Marked {} contracts as EXPIRED", expired.size());
        }
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkUpcomingRentDueReminders() {
        log.info("Running upcoming rent due reminder check...");
        LocalDate reminderDate = LocalDate.now().plusDays(3);
        List<RentPaymentSchedule> dueSoon = scheduleRepository.findByStatusAndDueDate(PaymentScheduleStatus.PENDING, reminderDate);
        dueSoon.forEach(rentPaymentService::notifyUpcomingRentDue);
        log.info("Sent {} rent due reminders for payments due on {}", dueSoon.size(), reminderDate);
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkContractsExpiringIn3Days() {
        log.info("Running 3-day contract expiry reminder check...");
        LocalDate target = LocalDate.now().plusDays(3);
        List<LeaseContract> expiring = contractRepository.findByStatusAndEndDate(ContractStatus.ACTIVE, target);
        expiring.forEach(leaseContractService::notifyContractExpiringSoon);
        log.info("Sent {} contract-expiring-soon notifications for contracts ending on {}", expiring.size(), target);
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkUpcomingMaintenanceInvoiceInstallments() {
        LocalDate target = LocalDate.now().plusDays(3);
        int count = maintenanceContractInvoiceService.notifyInstallmentsDueSoon(target);
        log.info("Sent {} maintenance invoice installment reminders for {}", count, target);
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkMaintenanceInvoiceInstallmentsDueToday() {
        LocalDate today = LocalDate.now();
        int count = maintenanceContractInvoiceService.notifyInstallmentsDueToday(today);
        log.info("Sent {} maintenance invoice installment due-today reminders", count);
    }
}
