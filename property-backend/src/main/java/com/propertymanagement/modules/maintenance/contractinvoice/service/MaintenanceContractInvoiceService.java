package com.propertymanagement.modules.maintenance.contractinvoice.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceContractInvoiceResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.contractinvoice.entity.MaintenanceContractInvoice;
import com.propertymanagement.modules.maintenance.contractinvoice.repository.MaintenanceContractInvoiceRepository;

@Service
@RequiredArgsConstructor
public class MaintenanceContractInvoiceService {

    private final MaintenanceContractInvoiceRepository invoiceRepo;
    private final MaintenanceContractRepository contractRepo;
    private final ContractorCompanyRepository companyRepo;

    // ── List all invoices (admin) ─────────────────────────────────────────
    public List<MaintenanceContractInvoiceResponse> listAll() {
        return invoiceRepo.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Get single invoice ────────────────────────────────────────────────
    public MaintenanceContractInvoiceResponse getById(Long id) {
        return toResponse(requireInvoice(id));
    }

    // ── List by contract ──────────────────────────────────────────────────
    public List<MaintenanceContractInvoiceResponse> listByContract(Long contractId) {
        return invoiceRepo.findByContractIdOrderByInvoiceYearAscInvoiceMonthAsc(contractId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Generate monthly invoices for a contract ──────────────────────────
    @Transactional
    public List<MaintenanceContractInvoiceResponse> generateMonthlyInvoices(Long contractId) {
        MaintenanceContract contract = requireContractActive(contractId);

        if (contract.getContractValue() == null) {
            throw AppException.badRequest("Contract must have a contract value to generate invoices");
        }
        if (contract.getStartDate() == null || contract.getEndDate() == null) {
            throw AppException.badRequest("Contract must have both start and end dates to generate invoices");
        }

        BigDecimal monthlyAmount = contract.getContractValue()
                .divide(BigDecimal.valueOf(12), 3, RoundingMode.HALF_UP);

        LocalDate cursor = contract.getStartDate().withDayOfMonth(1);
        LocalDate contractEnd = contract.getEndDate();

        List<MaintenanceContractInvoice> created = new ArrayList<>();

        while (!cursor.isAfter(contractEnd)) {
            int month = cursor.getMonthValue();
            int year  = cursor.getYear();

            if (!invoiceRepo.existsByContractIdAndInvoiceMonthAndInvoiceYear(contractId, month, year)) {
                LocalDate dueDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1); // last day of month

                MaintenanceContractInvoice invoice = MaintenanceContractInvoice.builder()
                        .invoiceNumber(generateInvoiceNumber(year, month))
                        .contractId(contractId)
                        .contractorCompanyId(contract.getContractorCompanyId())
                        .propertyId(contract.getPropertyId())
                        .invoiceMonth(month)
                        .invoiceYear(year)
                        .amount(monthlyAmount)
                        .dueDate(dueDate)
                        .status("DRAFT")
                        .build();

                created.add(invoiceRepo.save(invoice));
            }

            cursor = cursor.plusMonths(1);
        }

        return created.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Mark invoice paid ─────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractInvoiceResponse markPaid(Long id) {
        MaintenanceContractInvoice invoice = requireInvoice(id);
        if ("CANCELLED".equals(invoice.getStatus())) {
            throw AppException.badRequest("Cannot mark a cancelled invoice as paid");
        }
        invoice.setStatus("PAID");
        invoice.setPaidDate(LocalDate.now());
        invoiceRepo.save(invoice);
        return toResponse(invoice);
    }

    // ── Cancel invoice ────────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractInvoiceResponse cancel(Long id) {
        MaintenanceContractInvoice invoice = requireInvoice(id);
        if ("PAID".equals(invoice.getStatus())) {
            throw AppException.badRequest("Cannot cancel a paid invoice");
        }
        invoice.setStatus("CANCELLED");
        invoiceRepo.save(invoice);
        return toResponse(invoice);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private MaintenanceContractInvoice requireInvoice(Long id) {
        return invoiceRepo.findById(id)
                .orElseThrow(() -> AppException.notFound("Invoice not found with id " + id));
    }

    private MaintenanceContract requireContractActive(Long contractId) {
        MaintenanceContract c = contractRepo.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found with id " + contractId));
        if (!"ACTIVE".equals(c.getStatus())) {
            throw AppException.badRequest("Invoices can only be generated for active contracts");
        }
        return c;
    }

    private String generateInvoiceNumber(int year, int month) {
        long seq = invoiceRepo.count() + 1;
        String candidate = String.format("MCI-%d-%02d-%05d", year, month, seq);
        while (invoiceRepo.existsByInvoiceNumber(candidate)) {
            seq++;
            candidate = String.format("MCI-%d-%02d-%05d", year, month, seq);
        }
        return candidate;
    }

    MaintenanceContractInvoiceResponse toResponse(MaintenanceContractInvoice inv) {
        String contractNumber = contractRepo.findById(inv.getContractId())
                .map(MaintenanceContract::getContractNumber).orElse(null);

        String companyName = null, companyNameAr = null, companyNameEn = null;
        ContractorCompanyEntity company = companyRepo.findById(inv.getContractorCompanyId()).orElse(null);
        if (company != null) {
            companyName   = company.getName();
            companyNameAr = company.getNameAr();
            companyNameEn = company.getNameEn();
        }

        return new MaintenanceContractInvoiceResponse(
                inv.getId(), inv.getInvoiceNumber(),
                inv.getContractId(), contractNumber,
                inv.getContractorCompanyId(), companyName, companyNameAr, companyNameEn,
                inv.getPropertyId(),
                inv.getInvoiceMonth(), inv.getInvoiceYear(),
                inv.getAmount(), inv.getDueDate(), inv.getPaidDate(),
                inv.getStatus(), inv.getNotes(), inv.getCreatedAt()
        );
    }
}
