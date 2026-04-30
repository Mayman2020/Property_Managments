package com.propertymanagement.modules.maintenance.invoice;

import com.propertymanagement.modules.contractor.ContractorCompany;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.invoice.dto.MaintenanceInvoiceResponse;
import com.propertymanagement.modules.maintenance.invoice.dto.ReviewInvoiceDto;
import com.propertymanagement.modules.maintenance.invoice.dto.SubmitInvoiceDto;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceInvoiceService {

    private final MaintenanceInvoiceRepository invoiceRepository;
    private final ContractorCompanyRepository companyRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;

    // ── Contractor company officer submits invoice ──────────────────────────

    @Transactional
    public MaintenanceInvoiceResponse submit(Long companyId, Long submittedBy, SubmitInvoiceDto dto) {
        String year = String.valueOf(LocalDate.now().getYear());
        long count = invoiceRepository.countByInvoiceNumberStartingWith("INV-" + year);
        String invoiceNumber = String.format("INV-%s-%05d", year, count + 1);

        MaintenanceInvoice invoice = MaintenanceInvoice.builder()
                .invoiceNumber(invoiceNumber)
                .contractorCompanyId(companyId)
                .propertyId(dto.getPropertyId())
                .unitId(dto.getUnitId())
                .periodMonth(dto.getPeriodMonth())
                .periodYear(dto.getPeriodYear())
                .amount(dto.getAmount())
                .description(dto.getDescription())
                .fileUrl(dto.getFileUrl())
                .notes(dto.getNotes())
                .submittedBy(submittedBy)
                .status("PENDING")
                .build();

        return toResponse(invoiceRepository.save(invoice));
    }

    public List<MaintenanceInvoiceResponse> getMyInvoices(Long companyId, Integer year, Integer month) {
        List<MaintenanceInvoice> invoices = (year != null && month != null)
                ? invoiceRepository.findByCompanyAndPeriod(companyId, year, month)
                : invoiceRepository.findByContractorCompanyIdOrderByPeriodYearDescPeriodMonthDesc(companyId);
        return invoices.stream().map(this::toResponse).toList();
    }

    public List<Property> getCompanyProperties(Long companyId) {
        return propertyRepository.findByMaintenanceContractorCompanyIdAndActiveTrue(companyId);
    }

    // ── Accountant reviews ──────────────────────────────────────────────────

    public List<MaintenanceInvoiceResponse> getAllForAccountant(Integer year, Integer month) {
        List<MaintenanceInvoice> invoices = (year != null && month != null)
                ? invoiceRepository.findByPeriod(year, month)
                : invoiceRepository.findByStatusOrderByCreatedAtDesc("PENDING");

        Map<Long, ContractorCompany> companyMap = companyRepository.findAllById(
                invoices.stream().map(MaintenanceInvoice::getContractorCompanyId).distinct().toList()
        ).stream().collect(Collectors.toMap(ContractorCompany::getId, c -> c));

        Map<Long, Property> propertyMap = invoices.stream()
                .filter(i -> i.getPropertyId() != null)
                .map(MaintenanceInvoice::getPropertyId)
                .distinct()
                .collect(Collectors.toMap(
                        id -> id,
                        id -> propertyRepository.findById(id).orElse(null),
                        (a, b) -> a
                ));

        return invoices.stream()
                .map(i -> toResponseWithDetails(i, companyMap.get(i.getContractorCompanyId()), propertyMap.get(i.getPropertyId())))
                .toList();
    }

    @Transactional
    public MaintenanceInvoiceResponse review(Long invoiceId, ReviewInvoiceDto dto, Long reviewerUserId) {
        MaintenanceInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> AppException.notFound("Invoice not found: " + invoiceId));

        if (!"PENDING".equals(invoice.getStatus())) {
            throw AppException.badRequest("Invoice already reviewed");
        }

        invoice.setStatus(dto.getStatus());
        invoice.setNotes(dto.getNotes());
        invoice.setReviewedBy(reviewerUserId);
        invoice.setReviewedAt(LocalDateTime.now());

        return toResponse(invoiceRepository.save(invoice));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private MaintenanceInvoiceResponse toResponse(MaintenanceInvoice i) {
        String companyName = companyRepository.findById(i.getContractorCompanyId())
                .map(c -> c.getNameAr() != null ? c.getNameAr() : c.getName())
                .orElse(null);
        String propertyName = i.getPropertyId() != null
                ? propertyRepository.findById(i.getPropertyId()).map(Property::getPropertyName).orElse(null)
                : null;
        String unitNumber = i.getUnitId() != null
                ? unitRepository.findById(i.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;

        return buildResponse(i, companyName, propertyName, unitNumber);
    }

    private MaintenanceInvoiceResponse toResponseWithDetails(MaintenanceInvoice i,
                                                              ContractorCompany company,
                                                              Property property) {
        String companyName = company != null
                ? (company.getNameAr() != null ? company.getNameAr() : company.getName())
                : null;
        String propertyName = property != null ? property.getPropertyName() : null;
        String unitNumber = i.getUnitId() != null
                ? unitRepository.findById(i.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;

        return buildResponse(i, companyName, propertyName, unitNumber);
    }

    private MaintenanceInvoiceResponse buildResponse(MaintenanceInvoice i, String companyName,
                                                     String propertyName, String unitNumber) {
        return MaintenanceInvoiceResponse.builder()
                .id(i.getId())
                .invoiceNumber(i.getInvoiceNumber())
                .contractorCompanyId(i.getContractorCompanyId())
                .companyName(companyName)
                .propertyId(i.getPropertyId())
                .propertyName(propertyName)
                .unitId(i.getUnitId())
                .unitNumber(unitNumber)
                .periodMonth(i.getPeriodMonth())
                .periodYear(i.getPeriodYear())
                .amount(i.getAmount())
                .description(i.getDescription())
                .fileUrl(i.getFileUrl())
                .status(i.getStatus())
                .notes(i.getNotes())
                .reviewedAt(i.getReviewedAt())
                .createdAt(i.getCreatedAt())
                .build();
    }
}
