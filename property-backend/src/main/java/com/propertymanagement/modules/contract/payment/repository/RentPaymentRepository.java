package com.propertymanagement.modules.contract.payment.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;

public interface RentPaymentRepository extends JpaRepository<RentPayment, Long> {

    boolean existsByTenantId(Long tenantId);

    List<RentPayment> findByContractId(Long contractId);

    Optional<RentPayment> findTopByScheduleIdOrderByIdDesc(Long scheduleId);

    Page<RentPayment> findAll(Pageable pageable);

    Page<RentPayment> findAllByOrderByPaymentDateDesc(Pageable pageable);

    @Query("""
            SELECT rp FROM RentPayment rp
            WHERE rp.contractId IN (
                SELECT lc.id FROM LeaseContract lc WHERE lc.propertyId IN :propertyIds
            )
            ORDER BY rp.paymentDate DESC
            """)
    Page<RentPayment> findRecentForProperties(@Param("propertyIds") Collection<Long> propertyIds, Pageable pageable);

    @Query("SELECT SUM(rp.amountPaid) FROM RentPayment rp WHERE rp.contractId IN " +
           "(SELECT lc.id FROM LeaseContract lc WHERE lc.propertyId = :propertyId)")
    BigDecimal sumCollectedByProperty(@Param("propertyId") Long propertyId);

    List<RentPayment> findByPaymentDateBetweenOrderByPaymentDateAsc(LocalDate from, LocalDate to);
}
