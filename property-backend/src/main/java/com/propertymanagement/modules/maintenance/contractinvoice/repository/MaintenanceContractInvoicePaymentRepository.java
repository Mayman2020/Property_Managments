package com.propertymanagement.modules.maintenance.contractinvoice.repository;

import com.propertymanagement.modules.maintenance.contractinvoice.entity.MaintenanceContractInvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MaintenanceContractInvoicePaymentRepository extends JpaRepository<MaintenanceContractInvoicePayment, Long> {
    List<MaintenanceContractInvoicePayment> findByInvoiceIdOrderByInstallmentNoAsc(Long invoiceId);

    boolean existsByInvoiceId(Long invoiceId);

    Optional<MaintenanceContractInvoicePayment> findByInvoiceIdAndId(Long invoiceId, Long id);

    List<MaintenanceContractInvoicePayment> findByStatusAndDueDateAndReminder3dSentAtIsNull(String status, LocalDate dueDate);

    List<MaintenanceContractInvoicePayment> findByStatusAndDueDateAndDueTodaySentAtIsNull(String status, LocalDate dueDate);
}
