package com.propertymanagement.modules.contract.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface RentPaymentRepository extends JpaRepository<RentPayment, Long> {

    List<RentPayment> findByContractId(Long contractId);

    Page<RentPayment> findAll(Pageable pageable);

    @Query("SELECT SUM(rp.amountPaid) FROM RentPayment rp WHERE rp.contractId IN " +
           "(SELECT lc.id FROM LeaseContract lc WHERE lc.propertyId = :propertyId)")
    BigDecimal sumCollectedByProperty(@Param("propertyId") Long propertyId);
}
