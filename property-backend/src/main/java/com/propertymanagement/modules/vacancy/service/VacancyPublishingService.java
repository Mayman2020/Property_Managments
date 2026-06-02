package com.propertymanagement.modules.vacancy.service;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.vacancy.entity.ListingSource;
import com.propertymanagement.modules.vacancy.entity.VacancyListingEntity;
import com.propertymanagement.modules.vacancy.repository.VacancyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class VacancyPublishingService {

    private final VacancyRepository vacancyRepository;
    private final LeaseContractRepository contractRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;
    private final VacancyAlertRecipients vacancyAlertRecipients;

    // PHASE2B-DONE: TASK1 — auto vacancy publish on contract end
    @Transactional
    public boolean autoPublishFromContract(LeaseContract contract) {
        if (contract == null || contract.getUnitId() == null || contract.getPropertyId() == null) {
            return false;
        }
        if (contract.getStatus() != ContractStatus.TERMINATED && contract.getStatus() != ContractStatus.EXPIRED) {
            return false;
        }
        if (vacancyRepository.existsByUnitIdAndPublishedTrue(contract.getUnitId())) {
            return false;
        }

        Unit unit = unitRepository.findById(contract.getUnitId()).orElse(null);
        Property property = propertyRepository.findById(contract.getPropertyId()).orElse(null);
        String unitNumber = unit != null ? unit.getUnitNumber() : "—";
        String propertyName = property != null ? property.getPropertyName() : "—";
        String propertyNameAr = property != null ? property.getPropertyNameAr() : null;
        String propertyNameEn = property != null ? property.getPropertyNameEn() : null;

        LocalDateTime now = LocalDateTime.now();
        VacancyListingEntity listing = vacancyRepository.findByUnitId(contract.getUnitId())
                .map(existing -> updateListing(existing, contract, unitNumber, propertyName, propertyNameAr, propertyNameEn, now))
                .orElseGet(() -> newListing(contract, unitNumber, propertyName, propertyNameAr, propertyNameEn, now));

        VacancyListingEntity saved = vacancyRepository.save(listing);
        notifyVacancyPublished(contract.getPropertyId(), saved.getId(), unitNumber, propertyName);
        log.info("Auto-published vacancy listing {} for unit {} contract {}", saved.getId(), contract.getUnitId(), contract.getId());
        return true;
    }

  /** Removes published vacancy listings when a unit is no longer vacant. */
    @Transactional
    public void unpublishIfUnitOccupied(Long unitId) {
        if (unitId == null) {
            return;
        }
        vacancyRepository.findByUnitId(unitId).ifPresent(listing -> {
            if (listing.isPublished()) {
                listing.setPublished(false);
                listing.setUpdatedAt(LocalDateTime.now());
                vacancyRepository.save(listing);
                log.info("Unpublished vacancy listing {} for occupied unit {}", listing.getId(), unitId);
            }
        });
    }

    @Transactional
    public Map<String, Object> backfillAll() {
        List<Long> contractIds = vacancyRepository.findContractIdsNeedingVacancyPublish();
        int published = 0;
        int skipped = 0;
        for (Long contractId : contractIds) {
            LeaseContract contract = contractRepository.findById(contractId).orElse(null);
            if (contract == null) {
                skipped++;
                continue;
            }
            if (autoPublishFromContract(contract)) {
                published++;
            } else {
                skipped++;
            }
        }
        return Map.of(
                "candidates", contractIds.size(),
                "published", published,
                "skipped", skipped);
    }

    private VacancyListingEntity newListing(LeaseContract contract, String unitNumber, String propertyName,
                                            String propertyNameAr, String propertyNameEn, LocalDateTime now) {
        return VacancyListingEntity.builder()
                .unitId(contract.getUnitId())
                .propertyId(contract.getPropertyId())
                .titleAr(buildTitleAr(unitNumber, propertyNameAr, propertyName))
                .titleEn(buildTitleEn(unitNumber, propertyNameEn, propertyName))
                .askingRent(contract.getMonthlyRent())
                .currency(contract.getCurrency() != null ? contract.getCurrency() : "OMR")
                .availableFrom(LocalDate.now())
                .published(true)
                .publishedAt(now)
                .viewsCount(0)
                .createdAt(now)
                .updatedAt(now)
                .listingSource(ListingSource.AUTO_PUBLISHED)
                .build();
    }

    private VacancyListingEntity updateListing(VacancyListingEntity existing, LeaseContract contract,
                                               String unitNumber, String propertyName,
                                               String propertyNameAr, String propertyNameEn, LocalDateTime now) {
        existing.setPropertyId(contract.getPropertyId());
        existing.setTitleAr(buildTitleAr(unitNumber, propertyNameAr, propertyName));
        existing.setTitleEn(buildTitleEn(unitNumber, propertyNameEn, propertyName));
        existing.setAskingRent(contract.getMonthlyRent());
        existing.setCurrency(contract.getCurrency() != null ? contract.getCurrency() : "OMR");
        existing.setAvailableFrom(LocalDate.now());
        existing.setPublished(true);
        existing.setPublishedAt(now);
        existing.setUpdatedAt(now);
        existing.setListingSource(ListingSource.AUTO_PUBLISHED);
        return existing;
    }

    private void notifyVacancyPublished(Long propertyId, Long listingId, String unitNumber, String propertyName) {
        List<Long> recipients = vacancyAlertRecipients.resolve(propertyId);
        if (recipients.isEmpty()) {
            return;
        }
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("unitNumber", unitNumber);
        vars.put("propertyName", propertyName);
        notificationService.createLocalized(
                recipients,
                null,
                propertyId,
                listingId,
                NotificationType.VACANCY_PUBLISHED,
                "NOTIFICATIONS.VACANCY_PUBLISHED_TITLE",
                "NOTIFICATIONS.VACANCY_PUBLISHED_BODY",
                vars,
                Map.of("listingId", listingId));
    }

    private static String buildTitleAr(String unitNumber, String propertyNameAr, String propertyName) {
        String prop = propertyNameAr != null && !propertyNameAr.isBlank() ? propertyNameAr : propertyName;
        return "وحدة " + unitNumber + " — " + (prop != null ? prop : "");
    }

    private static String buildTitleEn(String unitNumber, String propertyNameEn, String propertyName) {
        String prop = propertyNameEn != null && !propertyNameEn.isBlank() ? propertyNameEn : propertyName;
        return "Unit " + unitNumber + " — " + (prop != null ? prop : "");
    }
}
