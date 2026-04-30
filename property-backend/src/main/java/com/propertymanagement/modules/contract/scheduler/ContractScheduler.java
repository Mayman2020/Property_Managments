package com.propertymanagement.modules.contract.scheduler;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.RentPaymentScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContractScheduler {

    private final RentPaymentScheduleRepository scheduleRepository;
    private final LeaseContractRepository contractRepository;

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
        List<?> expired = contractRepository.findByStatusAndEndDateBefore(
                ContractStatus.ACTIVE, today);
        expired.forEach(c -> {
            var contract = (com.propertymanagement.modules.contract.lease.LeaseContract) c;
            contract.setStatus(ContractStatus.EXPIRED);
            contractRepository.save(contract);
        });

        if (!expired.isEmpty()) {
            log.info("Marked {} contracts as EXPIRED", expired.size());
        }
    }
}
