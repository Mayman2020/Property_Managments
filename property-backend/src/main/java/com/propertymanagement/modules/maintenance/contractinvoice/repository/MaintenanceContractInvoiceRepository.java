package com.propertymanagement.modules.maintenance.contractinvoice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.maintenance.contractinvoice.entity.MaintenanceContractInvoice;

@Repository
public interface MaintenanceContractInvoiceRepository extends JpaRepository<MaintenanceContractInvoice, Long> {

    List<MaintenanceContractInvoice> findByContractIdOrderByInvoiceYearAscInvoiceMonthAsc(Long contractId);

    List<MaintenanceContractInvoice> findByPropertyIdOrderByInvoiceYearDescInvoiceMonthDesc(Long propertyId);

    List<MaintenanceContractInvoice> findByContractorCompanyIdOrderByInvoiceYearDescInvoiceMonthDesc(Long companyId);

    Optional<MaintenanceContractInvoice> findByContractIdAndInvoiceMonthAndInvoiceYear(
            Long contractId, Integer month, Integer year);

    boolean existsByContractIdAndInvoiceMonthAndInvoiceYear(Long contractId, Integer month, Integer year);

    boolean existsByInvoiceNumber(String invoiceNumber);

    long countByContractId(Long contractId);

    List<MaintenanceContractInvoice> findByStatusOrderByCreatedAtDesc(String status);
}
