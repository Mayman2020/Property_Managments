package com.propertymanagement.modules.vacancy.service;

import com.propertymanagement.modules.contract.lease.dto.CreateContractDto;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.vacancy.dto.ConvertInquiryResponse;
import com.propertymanagement.modules.vacancy.dto.CreateInquiryRequest;
import com.propertymanagement.modules.vacancy.dto.RentalInquiryResponseDTO;
import com.propertymanagement.modules.vacancy.dto.UpdateInquiryStatusRequest;
import com.propertymanagement.modules.vacancy.dto.VacancyListingResponseDTO;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.vacancy.dto.CreateVacancyRequest;
import com.propertymanagement.modules.vacancy.entity.ListingSource;
import com.propertymanagement.modules.vacancy.entity.RentalInquiryEntity;
import com.propertymanagement.modules.vacancy.entity.VacancyListingEntity;
import com.propertymanagement.modules.vacancy.repository.InquiryRepository;
import com.propertymanagement.modules.vacancy.repository.VacancyRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VacancyService {

    private static final Set<String> ALLOWED_INQUIRY_STATUSES = Set.of("NEW", "CONTACTED", "CONVERTED");

    private final VacancyRepository vacancyRepository;
    private final InquiryRepository inquiryRepository;
    private final TenantRepository tenantRepository;
    private final LeaseContractService leaseContractService;
    private final NotificationService notificationService;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final VacancyAlertRecipients vacancyAlertRecipients;

    public Page<VacancyListingResponseDTO> getListings(Pageable pageable, String q, Long propertyId, Long ownerId) {
        return vacancyRepository.search(trimToNull(q), propertyId, ownerId, pageable).map(row -> VacancyListingResponseDTO.builder()
                .id(row.getId())
                .titleAr(row.getTitleAr())
                .titleEn(row.getTitleEn())
                .propertyName(row.getPropertyName())
                .unitNumber(row.getUnitNumber())
                .askingRent(row.getAskingRent())
                .availableFrom(row.getAvailableFrom())
                .isPublished(row.getIsPublished())
                .listingSource(row.getListingSource())
                .viewsCount(row.getViewsCount())
                .propertyId(row.getPropertyId())
                .unitId(row.getUnitId())
                .ownerNameAr(row.getOwnerNameAr())
                .ownerNameEn(row.getOwnerNameEn())
                .build());
    }

    public VacancyListingResponseDTO getByUnitId(Long unitId) {
        return vacancyRepository.findByUnitId(unitId)
                .map(this::toListingDto)
                .orElse(null);
    }

    @Transactional
    public VacancyListingResponseDTO createListing(CreateVacancyRequest request, Long createdBy) {
        if (vacancyRepository.existsByUnitIdAndPublishedTrue(request.getUnitId())) {
            throw AppException.badRequest("An active vacancy listing already exists for this unit");
        }
        Unit unit = unitRepository.findById(request.getUnitId())
                .orElseThrow(() -> AppException.notFound("Unit not found"));
        if (unit.isRented() || unit.isReserved()) {
            throw AppException.badRequest("Cannot publish vacancy for a rented or reserved unit");
        }
        if (!unit.isActive()) {
            throw AppException.badRequest("Cannot publish vacancy for an inactive unit");
        }
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> AppException.notFound("Property not found"));
        LocalDateTime now = LocalDateTime.now();
        VacancyListingEntity listing = vacancyRepository.findByUnitId(request.getUnitId())
                .orElse(VacancyListingEntity.builder().unitId(request.getUnitId()).build());
        listing.setPropertyId(request.getPropertyId());
        listing.setTitleAr(request.getTitleAr() != null ? request.getTitleAr()
                : "وحدة " + unit.getUnitNumber() + " — " + property.getPropertyName());
        listing.setTitleEn(request.getTitleEn() != null ? request.getTitleEn()
                : "Unit " + unit.getUnitNumber() + " — " + property.getPropertyName());
        listing.setDescriptionAr(request.getDescriptionAr());
        listing.setAskingRent(request.getAskingRent() != null ? request.getAskingRent()
                : (unit.getRentAmount() != null ? unit.getRentAmount() : BigDecimal.ZERO));
        listing.setCurrency(request.getCurrency() != null ? request.getCurrency()
                : (unit.getCurrency() != null ? unit.getCurrency() : "OMR"));
        listing.setAvailableFrom(request.getAvailableFrom() != null ? request.getAvailableFrom() : LocalDate.now());
        listing.setPublished(true);
        listing.setPublishedAt(now);
        listing.setListingSource(ListingSource.MANUAL);
        listing.setCreatedBy(createdBy);
        if (listing.getCreatedAt() == null) {
            listing.setCreatedAt(now);
        }
        listing.setUpdatedAt(now);
        if (listing.getViewsCount() == null) {
            listing.setViewsCount(0);
        }
        VacancyListingEntity saved = vacancyRepository.save(listing);
        notifyVacancyPublishedManual(saved, unit.getUnitNumber(), property.getPropertyName());
        return toListingDto(saved);
    }

    @Transactional
    public VacancyListingResponseDTO unpublishListing(Long unitId) {
        Unit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> AppException.notFound("Unit not found"));
        if (unit.isRented() || unit.isReserved()) {
            throw AppException.badRequest("Cannot unpublish vacancy for a rented or reserved unit");
        }
        VacancyListingEntity listing = vacancyRepository.findByUnitId(unitId)
                .orElseThrow(() -> AppException.notFound("Vacancy listing not found"));
        if (!listing.isPublished()) {
            throw AppException.badRequest("Vacancy listing is not published");
        }
        listing.setPublished(false);
        listing.setUpdatedAt(LocalDateTime.now());
        return toListingDto(vacancyRepository.save(listing));
    }

    private VacancyListingResponseDTO toListingDto(VacancyListingEntity entity) {
        String propertyName = entity.getPropertyId() != null
                ? propertyRepository.findById(entity.getPropertyId()).map(Property::getPropertyName).orElse(null)
                : null;
        String unitNumber = entity.getUnitId() != null
                ? unitRepository.findById(entity.getUnitId()).map(Unit::getUnitNumber).orElse(null)
                : null;
        return VacancyListingResponseDTO.builder()
                .id(entity.getId())
                .titleAr(entity.getTitleAr())
                .titleEn(entity.getTitleEn())
                .propertyName(propertyName)
                .unitNumber(unitNumber)
                .askingRent(entity.getAskingRent())
                .availableFrom(entity.getAvailableFrom())
                .isPublished(entity.isPublished())
                .listingSource(entity.getListingSource() != null ? entity.getListingSource().name() : ListingSource.MANUAL.name())
                .unitId(entity.getUnitId())
                .propertyId(entity.getPropertyId())
                .viewsCount(entity.getViewsCount())
                .build();
    }

    private void notifyVacancyPublishedManual(VacancyListingEntity listing, String unitNumber, String propertyName) {
        List<Long> recipients = vacancyAlertRecipients.resolve(listing.getPropertyId());
        if (recipients.isEmpty()) {
            return;
        }
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("unitNumber", unitNumber);
        vars.put("propertyName", propertyName);
        notificationService.createLocalized(
                recipients,
                listing.getCreatedBy(),
                listing.getPropertyId(),
                listing.getId(),
                NotificationType.VACANCY_PUBLISHED,
                "NOTIFICATIONS.VACANCY_PUBLISHED_TITLE",
                "NOTIFICATIONS.VACANCY_PUBLISHED_BODY",
                vars,
                Map.of("listingId", listing.getId()));
    }

    public List<RentalInquiryResponseDTO> getInquiries(Long listingId) {
        return inquiryRepository.findRowsByListingId(listingId).stream()
                .map(row -> RentalInquiryResponseDTO.builder()
                        .id(row.getId())
                        .inquirerName(row.getInquirerName())
                        .inquirerPhone(row.getInquirerPhone())
                        .inquirerEmail(row.getInquirerEmail())
                        .status(row.getStatus())
                        .preferredStart(row.getPreferredStart())
                        .build())
                .toList();
    }

    // PHASE1-DONE: TASK4 — create inquiry + RENTAL_INQUIRY_RECEIVED
    @Transactional
    public RentalInquiryResponseDTO createInquiry(Long listingId, CreateInquiryRequest request) {
        VacancyListingEntity listing = vacancyRepository.findById(listingId)
                .orElseThrow(() -> AppException.notFound("Vacancy listing not found"));
        if (listing.getUnitId() == null || listing.getPropertyId() == null) {
            throw AppException.badRequest("Listing must be linked to a unit and property");
        }
        RentalInquiryEntity inquiry = RentalInquiryEntity.builder()
                .listingId(listingId)
                .unitId(listing.getUnitId())
                .propertyId(listing.getPropertyId())
                .inquirerName(request.getInquirerName().trim())
                .inquirerPhone(request.getInquirerPhone().trim())
                .inquirerEmail(trimToNull(request.getInquirerEmail()))
                .inquirerType(trimToNull(request.getInquirerType()))
                .message(trimToNull(request.getMessage()))
                .preferredStart(request.getPreferredStart())
                .status("NEW")
                .createdAt(LocalDateTime.now())
                .build();
        RentalInquiryEntity saved = inquiryRepository.save(inquiry);
        notifyRentalInquiryReceived(saved, listing);
        return toInquiryDto(saved);
    }

    @Transactional
    public RentalInquiryResponseDTO updateInquiryStatus(Long inquiryId, UpdateInquiryStatusRequest request) {
        RentalInquiryEntity inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> AppException.notFound("Inquiry not found"));
        String status = request.getStatus().trim().toUpperCase();
        if (!ALLOWED_INQUIRY_STATUSES.contains(status)) {
            throw AppException.badRequest("Status must be one of: NEW, CONTACTED, CONVERTED");
        }
        inquiry.setStatus(status);
        return toInquiryDto(inquiryRepository.save(inquiry));
    }

    // PHASE1-DONE: TASK4 — convert to draft tenant + lease contract
    @Transactional
    public ConvertInquiryResponse convertInquiry(Long inquiryId, Long actingUserId) {
        RentalInquiryEntity inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> AppException.notFound("Inquiry not found"));
        VacancyListingEntity listing = vacancyRepository.findById(inquiry.getListingId())
                .orElseThrow(() -> AppException.notFound("Vacancy listing not found"));
        if (listing.getUnitId() == null || listing.getPropertyId() == null) {
            throw AppException.badRequest("Listing missing unit or property");
        }
        if (listing.getAskingRent() == null) {
            throw AppException.badRequest("Listing must have asking rent to create a contract");
        }

        String name = inquiry.getInquirerName().trim();
        LocalDate start = inquiry.getPreferredStart() != null
                ? inquiry.getPreferredStart()
                : (listing.getAvailableFrom() != null ? listing.getAvailableFrom() : LocalDate.now());
        LocalDate end = start.plusYears(1);

        Tenant tenant = Tenant.builder()
                .fullName(name)
                .fullNameAr(name)
                .fullNameEn(name)
                .phone(inquiry.getInquirerPhone())
                .email(trimToNull(inquiry.getInquirerEmail()))
                .unitId(listing.getUnitId())
                .propertyId(listing.getPropertyId())
                .leaseStart(start)
                .leaseEnd(end)
                .notes("Converted from rental inquiry #" + inquiryId)
                .active(true)
                .build();
        tenant = tenantRepository.save(tenant);

        CreateContractDto contractDto = new CreateContractDto();
        contractDto.setTenantId(tenant.getId());
        contractDto.setUnitId(listing.getUnitId());
        contractDto.setPropertyId(listing.getPropertyId());
        contractDto.setStartDate(start);
        contractDto.setEndDate(end);
        contractDto.setMonthlyRent(listing.getAskingRent());
        contractDto.setCurrency(listing.getCurrency() != null ? listing.getCurrency() : "OMR");
        contractDto.setNotes("From vacancy inquiry #" + inquiryId);

        ContractResponse contract = leaseContractService.create(contractDto, actingUserId);

        inquiry.setStatus("CONVERTED");
        inquiryRepository.save(inquiry);

        return ConvertInquiryResponse.builder()
                .inquiryId(inquiryId)
                .tenantId(tenant.getId())
                .contractId(contract.getId())
                .build();
    }

    private void notifyRentalInquiryReceived(RentalInquiryEntity inquiry, VacancyListingEntity listing) {
        List<Long> recipients = vacancyAlertRecipients.resolve(inquiry.getPropertyId());
        if (recipients.isEmpty()) {
            return;
        }
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("inquirerName", inquiry.getInquirerName());
        vars.put("listingTitle", listing.getTitleAr() != null ? listing.getTitleAr() : listing.getTitleEn());
        notificationService.createLocalized(
                recipients,
                null,
                inquiry.getPropertyId(),
                inquiry.getId(),
                NotificationType.RENTAL_INQUIRY_RECEIVED,
                "NOTIFICATIONS.RENTAL_INQUIRY_RECEIVED_TITLE",
                "NOTIFICATIONS.RENTAL_INQUIRY_RECEIVED_BODY",
                vars,
                Map.of("listingId", listing.getId(), "inquiryId", inquiry.getId()));
    }

    private RentalInquiryResponseDTO toInquiryDto(RentalInquiryEntity entity) {
        return RentalInquiryResponseDTO.builder()
                .id(entity.getId())
                .inquirerName(entity.getInquirerName())
                .inquirerPhone(entity.getInquirerPhone())
                .inquirerEmail(entity.getInquirerEmail())
                .status(entity.getStatus())
                .preferredStart(entity.getPreferredStart())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
