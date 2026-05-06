package com.propertymanagement.modules.ownerportal;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContract;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.owner.Owner;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.ownerportal.dto.OwnerAmendDraftRequest;
import com.propertymanagement.modules.ownerportal.dto.UnitOptionDto;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.unit.Unit;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.tenant.TenantPortalWelcomeService;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OwnerPortalDraftContractService {

    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final OwnerRepository ownerRepository;
    private final LeaseContractRepository contractRepository;
    private final LeaseContractService leaseContractService;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final TenantPortalWelcomeService tenantPortalWelcomeService;
    private final AppMessages appMessages;

    public List<ContractResponse> listDraftsForCurrentOwner() {
        Owner owner = currentOwner();
        // Property-based scoping: any owner (primary or co-owner) of a property sees its drafts,
        // even legacy drafts where contract.owner_id is null.
        Set<Long> propertyIds = propertyIdsForOwner(owner.getId());
        if (propertyIds.isEmpty()) {
            return List.of();
        }
        return contractRepository
                .findByStatusAndPropertyIdInOrderByCreatedAtDesc(ContractStatus.DRAFT, propertyIds)
                .stream()
                .map(leaseContractService::toResponse)
                .toList();
    }

    /** Active units on all properties this owner may use — for amending draft unit before approval. */
    public List<UnitOptionDto> listUnitOptionsForDraftAmend(Long contractId) {
        Owner owner = currentOwner();
        LeaseContract c = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + contractId));
        assertOwnerDraft(c, owner.getId());
        LinkedHashSet<Long> propertyIds = new LinkedHashSet<>();
        propertyRepository.findByOwnerIdAndActiveTrue(owner.getId()).forEach(p -> propertyIds.add(p.getId()));
        for (Long pid : propertyRepository.findPropertyIdsByCoOwner(owner.getId())) {
            if (pid != null) {
                propertyIds.add(pid);
            }
        }
        if (c.getPropertyId() != null) {
            propertyIds.add(c.getPropertyId());
        }
        List<UnitOptionDto> out = new ArrayList<>();
        for (Long pid : propertyIds) {
            if (!ownerMayUseProperty(owner.getId(), pid)) {
                continue;
            }
            String propName = propertyRepository.findById(pid).map(Property::getPropertyName).orElse("");
            for (Unit u : unitRepository.findByPropertyIdAndActiveTrue(pid)) {
                out.add(UnitOptionDto.builder()
                        .id(u.getId())
                        .unitNumber(u.getUnitNumber())
                        .propertyId(pid)
                        .propertyName(propName)
                        .build());
            }
        }
        out.sort(Comparator.comparing(UnitOptionDto::getPropertyName, Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(UnitOptionDto::getUnitNumber, Comparator.nullsLast(String::compareToIgnoreCase)));
        return out;
    }

    @Transactional
    public ContractResponse rejectDraft(Long contractId, String reason) {
        Owner owner = currentOwner();
        LeaseContract c = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + contractId));
        assertOwnerDraft(c, owner.getId());
        if (reason == null || reason.isBlank()) {
            throw AppException.badRequest("Rejection reason is required");
        }
        Long oldUnitId = c.getUnitId();
        c.setStatus(ContractStatus.CANCELLED);
        c.setOwnerApprovalStatus("REJECTED");
        c.setOwnerApprovalNotes(reason.trim());
        c.setOwnerApprovedAt(LocalDateTime.now());
        c.setOwnerApprovedBy(currentUserId());
        contractRepository.save(c);
        leaseContractService.syncUnitRentedFromContracts(oldUnitId);
        try {
            tenantPortalWelcomeService.notifyTenantOwnerRejectedLease(c, reason.trim());
        } catch (Exception ignored) {
            // ignore
        }
        return leaseContractService.toResponse(c);
    }

    @Transactional
    public ContractResponse amendDraft(Long contractId, OwnerAmendDraftRequest dto) {
        Owner owner = currentOwner();
        LeaseContract c = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + contractId));
        assertOwnerDraft(c, owner.getId());
        if (dto.getReason() == null || dto.getReason().isBlank()) {
            throw AppException.badRequest("Amendment reason is required");
        }
        boolean unitChange = dto.getUnitId() != null && !Objects.equals(dto.getUnitId(), c.getUnitId());
        boolean rentChange = dto.getMonthlyRent() != null
                && (c.getMonthlyRent() == null || dto.getMonthlyRent().compareTo(c.getMonthlyRent()) != 0);
        if (!unitChange && !rentChange) {
            throw AppException.badRequest("Provide a new unit or a different monthly rent to amend");
        }

        StringBuilder line = new StringBuilder();
        line.append(TS.format(LocalDateTime.now()))
                .append(" | owner=").append(owner.getFullName());

        Long previousUnitId = c.getUnitId();
        String oldUnitNumForNotify = unitRepository.findById(previousUnitId).map(Unit::getUnitNumber).orElse("?");
        BigDecimal rentBefore = c.getMonthlyRent();
        if (unitChange) {
            Unit newUnit = unitRepository.findById(dto.getUnitId())
                    .filter(Unit::isActive)
                    .orElseThrow(() -> AppException.badRequest("Unit not found or inactive"));
            if (!ownerMayUseProperty(owner.getId(), newUnit.getPropertyId())) {
                throw AppException.forbidden("Unit is not under your properties");
            }
            String oldUn = oldUnitNumForNotify;
            line.append(" | unit: ").append(oldUn).append("(#").append(previousUnitId).append(") → ")
                    .append(newUnit.getUnitNumber()).append("(#").append(newUnit.getId()).append(")");
            c.setUnitId(newUnit.getId());
            c.setPropertyId(newUnit.getPropertyId());
        }
        if (rentChange) {
            if (dto.getMonthlyRent().signum() <= 0) {
                throw AppException.badRequest("Monthly rent must be positive");
            }
            BigDecimal oldRent = c.getMonthlyRent();
            line.append(" | rent: ").append(oldRent != null ? oldRent : "?").append(" → ").append(dto.getMonthlyRent());
            c.setMonthlyRent(dto.getMonthlyRent());
        }
        line.append(" | reason: ").append(dto.getReason().trim());

        c.setOwnerChangeLog(appendLog(c.getOwnerChangeLog(), line.toString()));
        contractRepository.save(c);

        leaseContractService.syncUnitRentedFromContracts(c.getUnitId());
        if (unitChange && previousUnitId != null && !Objects.equals(previousUnitId, c.getUnitId())) {
            leaseContractService.syncUnitRentedFromContracts(previousUnitId);
        }

        String newUnitNumForNotify = unitRepository.findById(c.getUnitId()).map(Unit::getUnitNumber).orElse("?");
        List<String> partsAr = new ArrayList<>();
        List<String> partsEn = new ArrayList<>();
        if (unitChange) {
            partsAr.add(appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_amend.line.unit",
                    oldUnitNumForNotify, newUnitNumForNotify));
            partsEn.add(appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_amend.line.unit",
                    oldUnitNumForNotify, newUnitNumForNotify));
        }
        if (rentChange) {
            String o = rentBefore != null ? rentBefore.stripTrailingZeros().toPlainString() : "—";
            String n = c.getMonthlyRent() != null ? c.getMonthlyRent().stripTrailingZeros().toPlainString() : "—";
            partsAr.add(appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_amend.line.rent", o, n));
            partsEn.add(appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_amend.line.rent", o, n));
        }
        String changesAr = partsAr.isEmpty() ? "—" : String.join(" ", partsAr);
        String changesEn = partsEn.isEmpty() ? "—" : String.join(" ", partsEn);
        try {
            tenantPortalWelcomeService.notifyTenantOwnerAmendedLease(
                    c, changesAr, changesEn, dto.getReason().trim());
        } catch (Exception ignored) {
            // ignore
        }
        return leaseContractService.toResponse(c);
    }

    private void assertOwnerDraft(LeaseContract c, Long ownerId) {
        if (c.getStatus() != ContractStatus.DRAFT) {
            throw AppException.badRequest("Only draft contracts can be changed here");
        }
        // Authorize via property ownership (covers co-owners and legacy drafts where owner_id is null).
        // Fall back to the legacy contract.owner_id check when the property is unknown.
        if (c.getPropertyId() != null) {
            if (!ownerMayUseProperty(ownerId, c.getPropertyId())) {
                throw AppException.forbidden("This contract is not assigned to you");
            }
            return;
        }
        if (c.getOwnerId() == null || !c.getOwnerId().equals(ownerId)) {
            throw AppException.forbidden("This contract is not assigned to you");
        }
    }

    private Set<Long> propertyIdsForOwner(Long ownerId) {
        Set<Long> ids = new HashSet<>(propertyRepository.findPropertyIdsByCoOwner(ownerId));
        propertyRepository.findByOwnerIdAndActiveTrue(ownerId).forEach(p -> ids.add(p.getId()));
        return ids;
    }

    private boolean ownerMayUseProperty(Long ownerId, Long propertyId) {
        Property p = propertyRepository.findById(propertyId).filter(Property::isActive).orElse(null);
        if (p == null) {
            return false;
        }
        if (p.getOwnerId() != null && p.getOwnerId().equals(ownerId)) {
            return true;
        }
        return propertyRepository.countPropertyOwnerLink(propertyId, ownerId) > 0;
    }

    private String appendLog(String existing, String line) {
        if (existing == null || existing.isBlank()) {
            return line;
        }
        return existing + "\n" + line;
    }

    private Owner currentOwner() {
        Long uid = currentUserId();
        return ownerRepository.findByUserId(uid)
                .orElseThrow(() -> AppException.notFound("Owner profile not linked to current user"));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
