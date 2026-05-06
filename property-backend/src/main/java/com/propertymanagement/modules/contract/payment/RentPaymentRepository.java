package com.propertymanagement.modules.contract.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface RentPaymentRepository extends JpaRepository<RentPayment, Long> {

    boolean existsByTenantId(Long tenantId);

    List<RentPayment> findByContractId(Long contractId);

    Optional<RentPayment> findTopByScheduleIdOrderByIdDesc(Long scheduleId);

    Page<RentPayment> findAll(Pageable pageable);

    @Query("SELECT SUM(rp.amountPaid) FROM RentPayment rp WHERE rp.contractId IN " +
           "(SELECT lc.id FROM LeaseContract lc WHERE lc.propertyId = :propertyId)")
    BigDecimal sumCollectedByProperty(@Param("propertyId") Long propertyId);
}
