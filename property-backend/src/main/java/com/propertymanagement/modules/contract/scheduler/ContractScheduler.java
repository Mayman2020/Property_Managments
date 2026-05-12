package com.propertymanagement.modules.contract.scheduler;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.contract.payment.service.RentPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
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

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkOverduePayments() {
        log.info("Running overdue payment check...");
        List<RentPaymentSchedule> pending = scheduleRepository
                .findByStatusAndDueDateBefore(PaymentScheduleStatus.PENDING, LocalDate.now());
        pending.forEach(s -> {
            s.setStatus(PaymentScheduleStatus.OVERDUE);
            scheduleRepository.save(s);
        });
        log.info("Marked {} payments as OVERDUE", pending.size());
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkExpiringContracts() {
        log.info("Running expiring contract check...");
        LocalDate today = LocalDate.now();

        // Mark EXPIRED contracts
        List<LeaseContract> expired = contractRepository.findByStatusAndEndDateBefore(
                ContractStatus.ACTIVE, today);
        Set<Long> unitIds = new HashSet<>();
        for (LeaseContract contract : expired) {
            contract.setStatus(ContractStatus.EXPIRED);
            LeaseContract saved = contractRepository.save(contract);
            leaseContractService.notifyContractExpired(saved);
            if (contract.getUnitId() != null) {
                unitIds.add(contract.getUnitId());
            }
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
}
