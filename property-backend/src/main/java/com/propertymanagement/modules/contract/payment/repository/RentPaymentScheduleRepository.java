package com.propertymanagement.modules.contract.payment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;

import java.time.LocalDate;
import java.util.List;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;

public interface RentPaymentScheduleRepository extends JpaRepository<RentPaymentSchedule, Long> {

    List<RentPaymentSchedule> findByContractId(Long contractId);

    Page<RentPaymentSchedule> findByContractIdOrderByDueDateAsc(Long contractId, Pageable pageable);

    List<RentPaymentSchedule> findByStatusOrderByProofSubmittedAtAsc(PaymentScheduleStatus status);

    List<RentPaymentSchedule> findByStatusAndDueDateBefore(PaymentScheduleStatus status, LocalDate date);

    @Query("""
            SELECT s FROM RentPaymentSchedule s
            WHERE s.status = :status
              AND s.dueDate < :date
              AND s.contractId IN (
                SELECT lc.id FROM LeaseContract lc
                WHERE lc.status = 'ACTIVE'
              )
            """)
    List<RentPaymentSchedule> findActiveContractOverdue(
            @Param("status") PaymentScheduleStatus status,
            @Param("date") LocalDate date);

    @Query("""
            SELECT s FROM RentPaymentSchedule s
            WHERE s.status = :status
              AND s.dueDate < :date
              AND s.contractId IN (
                SELECT lc.id FROM LeaseContract lc
                WHERE lc.status = 'ACTIVE'
                  AND lc.propertyId = :propertyId
              )
            """)
    List<RentPaymentSchedule> findActiveContractOverdueByProperty(
            @Param("status") PaymentScheduleStatus status,
            @Param("date") LocalDate date,
            @Param("propertyId") Long propertyId);

    @Query("""
            SELECT s FROM RentPaymentSchedule s
            WHERE s.status = :status
              AND s.dueDate < :date
              AND s.contractId IN (
                SELECT lc.id FROM LeaseContract lc
                WHERE lc.status = 'ACTIVE'
                  AND lc.propertyId IN :propertyIds
              )
            """)
    List<RentPaymentSchedule> findActiveContractOverdueInProperties(
            @Param("status") PaymentScheduleStatus status,
            @Param("date") LocalDate date,
            @Param("propertyIds") java.util.Collection<Long> propertyIds);

    List<RentPaymentSchedule> findByStatusAndDueDate(PaymentScheduleStatus status, LocalDate dueDate);

    RentPaymentSchedule findFirstByContractIdAndStatusAndDueDateAfterOrderByDueDateAsc(
            Long contractId,
            PaymentScheduleStatus status,
            LocalDate dueDate);

    @Modifying
    @Query("UPDATE RentPaymentSchedule s SET s.status = 'WAIVED' WHERE s.contractId = :contractId AND s.status = 'PENDING' AND s.dueDate > :afterDate")
    void waiveRemainingSchedule(@Param("contractId") Long contractId, @Param("afterDate") LocalDate afterDate);

    @Query("""
            SELECT COUNT(DISTINCT s.contractId) FROM RentPaymentSchedule s
            WHERE s.status = 'OVERDUE'
              AND s.contractId IN (
                SELECT lc.id FROM LeaseContract lc WHERE lc.status = 'ACTIVE'
              )
            """)
    long countOverdue();

    @Query("""
            SELECT COUNT(DISTINCT s.contractId) FROM RentPaymentSchedule s
            WHERE s.status = 'OVERDUE'
              AND s.contractId IN (
                SELECT lc.id FROM LeaseContract lc
                WHERE lc.propertyId = :propertyId AND lc.status = 'ACTIVE'
              )
            """)
    long countOverdueByProperty(@Param("propertyId") Long propertyId);
}
