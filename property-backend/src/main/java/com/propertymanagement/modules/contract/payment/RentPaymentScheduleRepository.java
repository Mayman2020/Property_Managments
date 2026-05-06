package com.propertymanagement.modules.contract.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RentPaymentScheduleRepository extends JpaRepository<RentPaymentSchedule, Long> {

    List<RentPaymentSchedule> findByContractId(Long contractId);

    Page<RentPaymentSchedule> findByContractIdOrderByDueDateAsc(Long contractId, Pageable pageable);

    List<RentPaymentSchedule> findByStatusOrderByProofSubmittedAtAsc(PaymentScheduleStatus status);

    List<RentPaymentSchedule> findByStatusAndDueDateBefore(PaymentScheduleStatus status, LocalDate date);

    @Modifying
    @Query("UPDATE RentPaymentSchedule s SET s.status = 'WAIVED' WHERE s.contractId = :contractId AND s.status = 'PENDING' AND s.dueDate > :afterDate")
    void waiveRemainingSchedule(@Param("contractId") Long contractId, @Param("afterDate") LocalDate afterDate);

    @Query("SELECT COUNT(s) FROM RentPaymentSchedule s WHERE s.status = 'OVERDUE'")
    long countOverdue();

    @Query("""
            SELECT COUNT(s) FROM RentPaymentSchedule s
            WHERE s.status = 'OVERDUE'
              AND s.contractId IN (
                SELECT lc.id FROM LeaseContract lc WHERE lc.propertyId = :propertyId
              )
            """)
    long countOverdueByProperty(@Param("propertyId") Long propertyId);
}
