package com.propertymanagement.modules.maintenance.invoice.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.invoice.dto.MaintenanceInvoiceFilterOptionsDto;
import com.propertymanagement.modules.maintenance.invoice.dto.MaintenanceInvoiceResponse;
import com.propertymanagement.modules.maintenance.invoice.dto.ReviewInvoiceDto;
import com.propertymanagement.modules.maintenance.invoice.dto.SubmitInvoiceDto;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import com.propertymanagement.codegen.CodeGenerationService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.invoice.entity.MaintenanceInvoice;
import com.propertymanagement.modules.maintenance.invoice.repository.MaintenanceInvoiceRepository;

@Service
@RequiredArgsConstructor
public class MaintenanceInvoiceService {

    private final MaintenanceInvoiceRepository invoiceRepository;
    private final ContractorCompanyRepository companyRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final MaintenanceContractRepository maintenanceContractRepository;
    private final CodeGenerationService codeGenerationService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    // ── Contractor company officer submits invoice ──────────────────────────

    @Transactional
    public MaintenanceInvoiceResponse submit(Long companyId, Long submittedBy, SubmitInvoiceDto dto) {
        Long propertyId = resolveInvoiceProperty(companyId, dto.getPropertyId());
        String invoiceNumber = codeGenerationService.generate("INV");

        MaintenanceInvoice invoice = MaintenanceInvoice.builder()
                .invoiceNumber(invoiceNumber)
                .contractorCompanyId(companyId)
                .propertyId(propertyId)
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

    public List<MaintenanceInvoiceResponse> getMyInvoices(Long companyId, Integer year, Integer month, Long propertyId) {
        Long scopedPropertyId = propertyId != null ? resolveInvoiceProperty(companyId, propertyId) : null;
        List<MaintenanceInvoice> invoices;
        if (year != null && month != null && scopedPropertyId != null) {
            invoices = invoiceRepository.findByCompanyAndPropertyAndPeriod(companyId, scopedPropertyId, year, month);
        } else if (year != null && month != null) {
            invoices = invoiceRepository.findByCompanyAndPeriod(companyId, year, month);
        } else if (scopedPropertyId != null) {
            invoices = invoiceRepository.findByContractorCompanyIdAndPropertyIdOrderByPeriodYearDescPeriodMonthDesc(companyId, scopedPropertyId);
        } else {
            invoices = invoiceRepository.findByContractorCompanyIdOrderByPeriodYearDescPeriodMonthDesc(companyId);
        }
        return invoices.stream().map(this::toResponse).toList();
    }

    public List<Property> getCompanyProperties(Long companyId) {
        List<Long> propertyIds = activeContractPropertyIds(companyId);
        if (propertyIds.isEmpty()) {
            return List.of();
        }
        return propertyRepository.findAllById(propertyIds).stream()
                .filter(Property::isActive)
                .toList();
    }

    // ── Accountant reviews ──────────────────────────────────────────────────

    public List<MaintenanceInvoiceResponse> getAllForAccountant(Integer year, Integer month,
                                                                Long propertyId, Long companyId) {
        List<MaintenanceInvoice> invoices = (year != null && month != null)
                ? invoiceRepository.findByPeriod(year, month)
                : invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            invoices = invoices.stream()
                    .filter(i -> i.getPropertyId() != null && ownerScope.contains(i.getPropertyId()))
                    .toList();
        }
        if (propertyId != null) {
            invoices = invoices.stream()
                    .filter(i -> propertyId.equals(i.getPropertyId()))
                    .toList();
        }
        if (companyId != null) {
            invoices = invoices.stream()
                    .filter(i -> companyId.equals(i.getContractorCompanyId()))
                    .toList();
        }

        Map<Long, ContractorCompanyEntity> companyMap = companyRepository.findAllById(
                invoices.stream().map(MaintenanceInvoice::getContractorCompanyId).distinct().toList()
        ).stream().collect(Collectors.toMap(ContractorCompanyEntity::getId, c -> c));

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

    public MaintenanceInvoiceFilterOptionsDto getFilterOptionsForAccountant(Long propertyId) {
        LocalDate today = LocalDate.now();
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();

        List<Long> activePropertyIds = maintenanceContractRepository.findActiveOngoingPropertyIds(today);
        if (ownerScope != null) {
            activePropertyIds = activePropertyIds.stream().filter(ownerScope::contains).toList();
        }

        List<MaintenanceInvoiceFilterOptionsDto.PropertyOption> properties = propertyRepository
                .findAllById(activePropertyIds).stream()
                .filter(Property::isActive)
                .map(p -> MaintenanceInvoiceFilterOptionsDto.PropertyOption.builder()
                        .id(p.getId())
                        .name(p.getPropertyName())
                        .nameAr(p.getPropertyNameAr())
                        .nameEn(p.getPropertyNameEn())
                        .build())
                .toList();

        List<MaintenanceInvoiceFilterOptionsDto.CompanyOption> companies = List.of();
        if (propertyId != null) {
            List<Long> companyIds = maintenanceContractRepository
                    .findActiveOngoingCompanyIdsByProperty(propertyId, today);
            companies = companyRepository.findAllById(companyIds).stream()
                    .filter(ContractorCompanyEntity::isActive)
                    .map(c -> MaintenanceInvoiceFilterOptionsDto.CompanyOption.builder()
                            .id(c.getId())
                            .name(c.getName())
                            .nameAr(c.getNameAr())
                            .nameEn(c.getNameEn())
                            .build())
                    .toList();
        }

        return MaintenanceInvoiceFilterOptionsDto.builder()
                .properties(properties)
                .companies(companies)
                .build();
    }

    @Transactional
    public MaintenanceInvoiceResponse review(Long invoiceId, ReviewInvoiceDto dto, Long reviewerUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot approve maintenance invoices");
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
        Property property = i.getPropertyId() != null
                ? propertyRepository.findById(i.getPropertyId()).orElse(null)
                : null;
        String propertyName = property != null ? property.getPropertyName() : null;
        String unitNumber = i.getUnitId() != null
                ? unitRepository.findById(i.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;

        return buildResponse(i, companyName, property, propertyName, unitNumber);
    }

    private MaintenanceInvoiceResponse toResponseWithDetails(MaintenanceInvoice i,
                                                              ContractorCompanyEntity company,
                                                              Property property) {
        String companyName = company != null
                ? (company.getNameAr() != null ? company.getNameAr() : company.getName())
                : null;
        String propertyName = property != null ? property.getPropertyName() : null;
        String unitNumber = i.getUnitId() != null
                ? unitRepository.findById(i.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;

        return buildResponse(i, companyName, property, propertyName, unitNumber);
    }

    private MaintenanceInvoiceResponse buildResponse(MaintenanceInvoice i, String companyName,
                                                     Property property, String propertyName, String unitNumber) {
        return MaintenanceInvoiceResponse.builder()
                .id(i.getId())
                .invoiceNumber(i.getInvoiceNumber())
                .contractorCompanyId(i.getContractorCompanyId())
                .companyName(companyName)
                .propertyId(i.getPropertyId())
                .propertyName(propertyName)
                .propertyNameAr(property != null ? property.getPropertyNameAr() : null)
                .propertyNameEn(property != null ? property.getPropertyNameEn() : null)
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

    private Long resolveInvoiceProperty(Long companyId, Long requestedPropertyId) {
        List<Long> activePropertyIds = activeContractPropertyIds(companyId);
        if (activePropertyIds.isEmpty()) {
            throw AppException.badRequest("Your company has no active maintenance contract on any property");
        }
        if (requestedPropertyId == null) {
            if (activePropertyIds.size() == 1) {
                return activePropertyIds.get(0);
            }
            throw AppException.badRequest("Property is required because your company has active contracts on multiple properties");
        }
        if (!activePropertyIds.contains(requestedPropertyId)) {
            throw AppException.badRequest("Selected property is not linked to an active maintenance contract for your company");
        }
        return requestedPropertyId;
    }

    private List<Long> activeContractPropertyIds(Long companyId) {
        return maintenanceContractRepository.findActiveOngoingByContractor(companyId, LocalDate.now()).stream()
                .map(com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract::getPropertyId)
                .filter(id -> id != null)
                .distinct()
                .toList();
    }
}
