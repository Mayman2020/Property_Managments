package com.propertymanagement.modules.contract.lease;

import com.propertymanagement.modules.contract.lease.dto.*;
import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.contract.payment.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.RentPaymentScheduleRepository;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.owner.OwnerPropertyAccessService;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenant.TenantPortalWelcomeService;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.unit.Unit;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.contract.renewal.ContractRenewalService;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaseContractService {

    private static final List<ContractStatus> UNIT_LIVE_LEASE_STATUSES = List.of(
            ContractStatus.ACTIVE,
            ContractStatus.SUSPENDED,
            ContractStatus.PENDING_TERMINATION_APPROVAL,
            ContractStatus.PENDING_RENEWAL_APPROVAL);

    private static final List<ContractStatus> UNIT_RESERVED_LEASE_STATUSES = List.of(
            ContractStatus.DRAFT,
            ContractStatus.PENDING_OWNER_APPROVAL);

    private static final DateTimeFormatter STAFF_LOG_TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final LeaseContractRepository contractRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final OwnerRepository ownerRepository;
    private final UserRepository userRepository;
    private final CodeGenerationService codeGenerationService;
    private final ObjectProvider<ContractRenewalService> contractRenewalService;
    private final TenantPortalWelcomeService tenantPortalWelcomeService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;

    public Page<ContractResponse> getAll(Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            return contractRepository.findByPropertyIdIn(ownerScope, pageable).map(this::toResponse);
        }
        return contractRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<ContractResponse> getByStatus(ContractStatus status, Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            return contractRepository.findByStatusAndPropertyIdIn(status, ownerScope, pageable).map(this::toResponse);
        }
        return contractRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    public ContractResponse getById(Long id) {
        LeaseContract contract = findById(id);
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        return toResponse(contract);
    }

    public List<ContractSummaryDto> getByTenant(Long tenantId) {
        List<ContractSummaryDto> list = contractRepository.findByTenantId(tenantId).stream()
                .map(this::toSummary)
                .toList();
        return filterSummariesForOwner(list);
    }

    public List<ContractSummaryDto> getExpiring(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        List<ContractSummaryDto> list = contractRepository.findExpiringBetween(LocalDate.now(), cutoff).stream()
                .map(this::toSummary)
                .toList();
        return filterSummariesForOwner(list);
    }

    private List<ContractSummaryDto> filterSummariesForOwner(List<ContractSummaryDto> list) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope == null) {
            return list;
        }
        return list.stream()
                .filter(s -> s.getPropertyId() != null && ownerScope.contains(s.getPropertyId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ContractResponse create(CreateContractDto dto) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot create lease contracts from this screen");
        String contractNumber = codeGenerationService.generate("CNT");

        // Ensure contract.owner_id is set so the owner portal (which scopes by owner)
        // can list the draft for review/approval. Fall back to the property's primary owner.
        Long resolvedOwnerId = dto.getOwnerId();
        if (resolvedOwnerId == null && dto.getPropertyId() != null) {
            resolvedOwnerId = propertyRepository.findById(dto.getPropertyId())
                    .map(Property::getOwnerId)
                    .orElse(null);
        }

        LeaseContract contract = LeaseContract.builder()
                .contractNumber(contractNumber)
                .tenantId(dto.getTenantId())
                .unitId(dto.getUnitId())
                .propertyId(dto.getPropertyId())
                .ownerId(resolvedOwnerId)
                .templateId(dto.getTemplateId())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .signingDate(dto.getSigningDate())
                .monthlyRent(dto.getMonthlyRent())
                .securityDeposit(dto.getSecurityDeposit() != null ? dto.getSecurityDeposit() : BigDecimal.ZERO)
                .paymentFrequency(dto.getPaymentFrequency() != null ? dto.getPaymentFrequency() : PaymentFrequency.MONTHLY)
                .paymentDay(dto.getPaymentDay() != null ? dto.getPaymentDay() : 1)
                .currency(dto.getCurrency() != null ? dto.getCurrency() : "OMR")
                .autoRenewable(Boolean.TRUE.equals(dto.getAutoRenewable()))
                .renewalNoticeDays(dto.getRenewalNoticeDays() != null ? dto.getRenewalNoticeDays() : 30)
                .notes(dto.getNotes())
                .hasFreeMonth(Boolean.TRUE.equals(dto.getHasFreeMonth()))
                .rentDiscountReason(dto.getRentDiscountReason())
                .otherReasonText(dto.getOtherReasonText())
                .status(ContractStatus.DRAFT)
                .build();

        LeaseContract saved = contractRepository.save(contract);
        syncUnitRentedFromContracts(dto.getUnitId());
        notifyOwnersOfDraftContract(saved);
        tenantPortalWelcomeService.notifyTenantDraftLeasePendingOwner(saved);
        return toResponse(saved);
    }

    /**
     * Notifies all portal users of the property's owners that a DRAFT lease was just created
     * (tenant onboarding, renewals, etc.) so they can review/amend/approve it.
     * Failures are swallowed so a notification glitch never blocks persistence.
     */
    public void notifyOwnersOfDraftContract(LeaseContract contract) {
        if (contract == null || contract.getPropertyId() == null) return;
        try {
            List<Long> recipients = propertyOwnerPortalRecipientService
                    .portalRecipientUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) return;
            String unitNumber = contract.getUnitId() != null
                    ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("—")
                    : "—";
            String propertyName = propertyRepository.findById(contract.getPropertyId())
                    .map(Property::getPropertyName).orElse("—");
            String tenantName = contract.getTenantId() != null
                    ? tenantRepository.findById(contract.getTenantId()).map(Tenant::getFullName).orElse("—")
                    : "—";
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
            vars.put("tenantName", tenantName);
            vars.put("unitNumber", unitNumber);
            vars.put("propertyName", propertyName);
            Map<String, Object> inboxParams = new LinkedHashMap<>();
            inboxParams.put("contractId", contract.getId());
            notificationService.createLocalized(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_AWAITING_OWNER_REVIEW,
                    "NOTIFICATIONS.CONTRACT_AWAITING_OWNER_REVIEW_TITLE",
                    "NOTIFICATIONS.CONTRACT_AWAITING_OWNER_REVIEW_BODY",
                    vars,
                    inboxParams);
        } catch (Exception ignored) {
            // Notification side-effect must not roll back the contract creation transaction.
        }
    }

    @Transactional
    public ContractResponse update(Long id, CreateContractDto dto, Long actingUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot edit lease contracts from this screen");
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw AppException.badRequest("Only DRAFT contracts can be edited");
        }
        java.math.BigDecimal previousRent = contract.getMonthlyRent();
        Long previousTenantId = contract.getTenantId();
        Long previousUnitId = contract.getUnitId();
        Long previousPropertyId = contract.getPropertyId();
        contract.setTenantId(dto.getTenantId());
        contract.setUnitId(dto.getUnitId());
        contract.setPropertyId(dto.getPropertyId());
        contract.setOwnerId(dto.getOwnerId());
        contract.setTemplateId(dto.getTemplateId());
        contract.setStartDate(dto.getStartDate());
        contract.setEndDate(dto.getEndDate());
        contract.setSigningDate(dto.getSigningDate());
        contract.setMonthlyRent(dto.getMonthlyRent());
        if (dto.getSecurityDeposit() != null) contract.setSecurityDeposit(dto.getSecurityDeposit());
        if (dto.getPaymentFrequency() != null) contract.setPaymentFrequency(dto.getPaymentFrequency());
        if (dto.getPaymentDay() != null) contract.setPaymentDay(dto.getPaymentDay());
        if (dto.getCurrency() != null) contract.setCurrency(dto.getCurrency());
        if (dto.getAutoRenewable() != null) contract.setAutoRenewable(dto.getAutoRenewable());
        if (dto.getRenewalNoticeDays() != null) contract.setRenewalNoticeDays(dto.getRenewalNoticeDays());
        contract.setNotes(dto.getNotes());
        if (dto.getHasFreeMonth() != null) contract.setHasFreeMonth(dto.getHasFreeMonth());
        if (dto.getRentDiscountReason() != null) contract.setRentDiscountReason(dto.getRentDiscountReason());
        if (dto.getOtherReasonText() != null) contract.setOtherReasonText(dto.getOtherReasonText());
        String logDetail = buildDraftUpdateLogDetail(contract, dto, previousRent);
        appendStaffLog(contract, actingUserId, "DRAFT_UPDATED", logDetail);
        LeaseContract saved = contractRepository.save(contract);
        if (!Objects.equals(previousUnitId, saved.getUnitId())) {
            syncUnitRentedFromContracts(previousUnitId);
        }
        syncUnitRentedFromContracts(saved.getUnitId());
        boolean draftPartiesChanged = !Objects.equals(previousTenantId, saved.getTenantId())
                || !Objects.equals(previousUnitId, saved.getUnitId())
                || !Objects.equals(previousPropertyId, saved.getPropertyId());
        if (draftPartiesChanged) {
            notifyOwnersOfDraftContract(saved);
        }
        return toResponse(saved);
    }

    @Transactional
    public ContractResponse activate(Long id, Long approvedByUserId) {
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.DRAFT
                && contract.getStatus() != ContractStatus.PENDING_OWNER_APPROVAL) {
            throw AppException.badRequest("Only DRAFT or owner-pending contracts can be activated");
        }
        User acting = userRepository.findById(approvedByUserId).orElse(null);
        if (acting != null && acting.getRole() == UserRole.OWNER) {
            ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        }
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setApprovedBy(approvedByUserId);
        appendContractActivationAudit(contract, approvedByUserId, null);
        LeaseContract saved = contractRepository.save(contract);
        runPostActivationSideEffects(saved.getId());
        return toResponse(findById(saved.getId()));
    }

    /**
     * Payment schedule, renewal finalization, unit flags, tenant + accountant notifications.
     * Caller must have persisted the contract as {@link ContractStatus#ACTIVE} first.
     */
    @Transactional
    public void runPostActivationSideEffects(Long contractId) {
        LeaseContract contract = findById(contractId);
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw AppException.badRequest("Contract must be ACTIVE");
        }
        if (scheduleRepository.findByContractId(contract.getId()).isEmpty()) {
            generatePaymentSchedule(contract);
        }
        contractRenewalService.ifAvailable(s -> s.finalizeRenewal(contractId));
        syncUnitRentedFromContracts(contract.getUnitId());
        tenantPortalWelcomeService.notifyLeaseActivated(findById(contractId));
    }

    /** Staff/owner activation audit line on {@code contract} (not saved here). */
    public void appendContractActivationAudit(LeaseContract contract, Long actingUserId, String detail) {
        appendStaffLog(contract, actingUserId, "ACTIVATED", detail);
    }

    @Transactional
    public ContractResponse cancelDraft(Long id, String reason, Long actorUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot cancel drafts from this screen");
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.DRAFT
                && contract.getStatus() != ContractStatus.PENDING_OWNER_APPROVAL) {
            throw AppException.badRequest("Only DRAFT or owner-pending contracts can be cancelled");
        }
        String detail = (reason == null || reason.isBlank()) ? "(no reason given)" : reason.trim();
        appendStaffLog(contract, actorUserId, "CANCELLED", detail);
        contract.setStatus(ContractStatus.CANCELLED);
        Long unitId = contract.getUnitId();
        LeaseContract saved = contractRepository.save(contract);
        syncUnitRentedFromContracts(unitId);
        return toResponse(saved);
    }

    /**
     * Sets {@link com.propertymanagement.modules.unit.Unit#rented} from ACTIVE/SUSPENDED leases
     * and {@link com.propertymanagement.modules.unit.Unit#reserved} from DRAFT/PENDING when no live lease.
     */
    @Transactional
    public void syncUnitRentedFromContracts(Long unitId) {
        if (unitId == null) {
            return;
        }
        long live = contractRepository.countByUnitIdAndStatusIn(unitId, UNIT_LIVE_LEASE_STATUSES);
        long pendingReserve = contractRepository.countByUnitIdAndStatusIn(unitId, UNIT_RESERVED_LEASE_STATUSES);
        unitRepository.findById(unitId).ifPresent(u -> {
            u.setRented(live > 0);
            u.setReserved(pendingReserve > 0 && live == 0);
            unitRepository.save(u);
        });
    }

    private void appendStaffLog(LeaseContract contract, Long actorUserId, String action, String detail) {
        String actor = resolveUserName(actorUserId);
        if (actor == null || actor.isBlank()) {
            actor = actorUserId != null ? ("#" + actorUserId) : "system";
        }
        String safeDetail = detail == null ? "" : detail.replace('\n', ' ').replace('\r', ' ').trim();
        String line = LocalDateTime.now().format(STAFF_LOG_TS)
                + " | " + actor + " | " + action + " | " + safeDetail + "\n";
        String prev = contract.getStaffChangeLog() != null ? contract.getStaffChangeLog() : "";
        contract.setStaffChangeLog(prev + line);
    }

    private static String buildDraftUpdateLogDetail(LeaseContract contract, CreateContractDto dto, BigDecimal previousRent) {
        StringBuilder sb = new StringBuilder();
        sb.append(contract.getContractNumber());
        String reason = dto.getStaffModificationReason();
        if (reason != null && !reason.isBlank()) {
            sb.append(" | reason=").append(reason.trim());
            if ("PRICE_ADJUSTMENT".equals(reason) && previousRent != null && dto.getMonthlyRent() != null) {
                sb.append(" | rent ").append(previousRent.stripTrailingZeros().toPlainString())
                        .append("→").append(dto.getMonthlyRent().stripTrailingZeros().toPlainString());
            }
            if ("EMPLOYEE_DISCOUNT".equals(reason)) {
                if (dto.getEmployeeDiscountPercent() != null) {
                    sb.append(" | discount%=").append(dto.getEmployeeDiscountPercent().stripTrailingZeros().toPlainString());
                }
                if (dto.getLinkedEmployeeId() != null) {
                    sb.append(" | hrEmployeeId=").append(dto.getLinkedEmployeeId());
                }
            }
        } else {
            sb.append(" | fields updated");
        }
        return sb.toString();
    }

    @Transactional
    public ContractResponse requestRenewal(Long id, ContractRenewalRequestDto dto, Long requesterUserId) {
        ownerPropertyAccessService.denyOwnerMutation("error.contract.renewal.request.owner_forbidden");
        LeaseContract contract = findById(id);
        if (contract.getStatus() == ContractStatus.PENDING_TERMINATION_APPROVAL) {
            throw AppException.badRequest("error.contract.renewal.request.conflicting_pending_termination");
        }
        if (contract.getStatus() == ContractStatus.PENDING_RENEWAL_APPROVAL) {
            throw AppException.badRequest("error.contract.renewal.request.conflicting_pending_renewal");
        }
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw AppException.badRequest("error.contract.renewal.request.only_active");
        }
        LocalDate minStart = contract.getEndDate() != null ? contract.getEndDate() : LocalDate.now();
        if (dto.getProposedStartDate().isBefore(minStart)) {
            throw AppException.badRequest("error.contract.renewal.request.start_before_end");
        }
        if (!dto.getProposedEndDate().isAfter(dto.getProposedStartDate())) {
            throw AppException.badRequest("error.contract.renewal.request.invalid_date_range");
        }

        contract.setRenewalRequestedBy(requesterUserId);
        contract.setRenewalRequestedAt(LocalDateTime.now());
        contract.setRenewalRequestedNote(dto.getNote());
        contract.setRenewalProposedStartDate(dto.getProposedStartDate());
        contract.setRenewalProposedEndDate(dto.getProposedEndDate());
        contract.setRenewalProposedRentAmount(dto.getProposedRentAmount());
        contract.setRenewalDecisionBy(null);
        contract.setRenewalDecisionAt(null);
        contract.setRenewalDecisionNote(null);
        contract.setRenewalDecisionStatus(null);
        contract.setStatus(ContractStatus.PENDING_RENEWAL_APPROVAL);
        appendStaffLog(contract, requesterUserId, "RENEWAL_REQUESTED",
                "proposed " + dto.getProposedStartDate() + "→" + dto.getProposedEndDate()
                        + " rent=" + dto.getProposedRentAmount());
        LeaseContract saved = contractRepository.save(contract);
        notifyOwnersOfRenewalRequest(saved);
        tenantPortalWelcomeService.notifyTenantRenewalRequested(saved);
        return toResponse(saved);
    }

    @Transactional
    public ContractResponse cancelRenewalRequest(Long id, Long actorUserId) {
        ownerPropertyAccessService.denyOwnerMutation("error.contract.renewal.cancel.owner_forbidden");
        LeaseContract contract = contractRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + id));
        if (contract.getStatus() != ContractStatus.PENDING_RENEWAL_APPROVAL) {
            throw AppException.badRequest("error.contract.renewal.cancel.not_pending");
        }
        clearRenewalRequestFields(contract, true);
        contract.setStatus(ContractStatus.ACTIVE);
        appendStaffLog(contract, actorUserId, "RENEWAL_REQUEST_CANCELLED", "withdrawn by staff");
        LeaseContract saved = contractRepository.save(contract);
        return toResponse(saved);
    }

    @Transactional
    public ContractResponse finalizeRenewalApproval(Long id, Long ownerUserId, String ownerNotes) {
        LeaseContract contract = contractRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + id));
        if (contract.getStatus() != ContractStatus.PENDING_RENEWAL_APPROVAL) {
            // Idempotent-safe path: if already renewed, return existing generated contract.
            ContractRenewalService renewal = contractRenewalService.getIfAvailable();
            if (renewal != null) {
                ContractResponse existing = renewal.findExistingApprovedRenewalResult(contract.getId());
                if (existing != null) {
                    return existing;
                }
            }
            throw AppException.badRequest("error.contract.renewal.decision.no_longer_pending");
        }
        contract.setRenewalDecisionBy(ownerUserId);
        contract.setRenewalDecisionAt(LocalDateTime.now());
        contract.setRenewalDecisionNote(ownerNotes);
        contract.setRenewalDecisionStatus("APPROVED");
        appendStaffLog(contract, ownerUserId, "RENEWAL_APPROVED", safeReason(ownerNotes));
        contractRepository.save(contract);

        ContractRenewalService renewal = contractRenewalService.getIfAvailable();
        if (renewal == null) {
            throw AppException.badRequest("error.contract.renewal.service.unavailable");
        }
        ContractResponse approved = renewal.approvePendingRenewal(contract.getId(), ownerUserId, ownerNotes);
        LeaseContract source = findById(id);
        tenantPortalWelcomeService.notifyTenantRenewalDecided(source, true, ownerNotes, approved.getId());
        tenantPortalWelcomeService.notifyAccountantsOfRenewalDecision(source, true, ownerNotes, approved.getId());
        return approved;
    }

    @Transactional
    public ContractResponse finalizeRenewalRejection(Long id, Long ownerUserId, String ownerNotes) {
        LeaseContract contract = contractRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + id));
        if (contract.getStatus() != ContractStatus.PENDING_RENEWAL_APPROVAL) {
            throw AppException.badRequest("error.contract.renewal.decision.no_longer_pending");
        }
        contract.setRenewalDecisionBy(ownerUserId);
        contract.setRenewalDecisionAt(LocalDateTime.now());
        contract.setRenewalDecisionNote(ownerNotes);
        contract.setRenewalDecisionStatus("REJECTED");
        clearRenewalRequestFields(contract, false);
        contract.setStatus(ContractStatus.ACTIVE);
        appendStaffLog(contract, ownerUserId, "RENEWAL_REJECTED", safeReason(ownerNotes));
        LeaseContract saved = contractRepository.save(contract);
        tenantPortalWelcomeService.notifyTenantRenewalDecided(saved, false, ownerNotes, null);
        tenantPortalWelcomeService.notifyAccountantsOfRenewalDecision(saved, false, ownerNotes, null);
        return toResponse(saved);
    }

    public void notifyOwnersOfRenewalRequest(LeaseContract contract) {
        if (contract == null || contract.getPropertyId() == null) return;
        try {
            List<Long> recipients = propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) return;
            String unitNumber = contract.getUnitId() != null
                    ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("—")
                    : "—";
            String propertyName = propertyRepository.findById(contract.getPropertyId())
                    .map(Property::getPropertyName).orElse("—");
            String tenantName = contract.getTenantId() != null
                    ? tenantRepository.findById(contract.getTenantId()).map(Tenant::getFullName).orElse("—")
                    : "—";
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
            vars.put("tenantName", tenantName);
            vars.put("unitNumber", unitNumber);
            vars.put("propertyName", propertyName);
            vars.put("proposedStartDate", contract.getRenewalProposedStartDate() != null
                    ? contract.getRenewalProposedStartDate().toString() : "—");
            vars.put("proposedEndDate", contract.getRenewalProposedEndDate() != null
                    ? contract.getRenewalProposedEndDate().toString() : "—");
            vars.put("proposedRentAmount", contract.getRenewalProposedRentAmount() != null
                    ? contract.getRenewalProposedRentAmount().toPlainString() : "—");
            vars.put("requestNote", contract.getRenewalRequestedNote() != null
                    ? contract.getRenewalRequestedNote() : "—");
            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("contractId", contract.getId());
            notificationService.createLocalized(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_RENEWAL_REQUESTED,
                    "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REQUESTED.TITLE",
                    "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REQUESTED.BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // Notification side-effect must not roll back the renewal request transaction.
        }
    }

    /**
     * Staff submit a termination/handover request — the contract is moved to
     * {@link ContractStatus#PENDING_TERMINATION_APPROVAL}; the proposed handover values
     * are persisted on the same contract row for the owner to review. Schedule and unit
     * occupancy are NOT touched until the owner approves via
     * {@link OwnerApprovalService#processTerminationDecision}.
     */
    @Transactional
    public ContractResponse terminate(Long id, TerminateContractDto dto, Long terminatedByUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot terminate leases from this screen");
        LeaseContract contract = findById(id);
        if (contract.getStatus() == ContractStatus.PENDING_RENEWAL_APPROVAL) {
            throw AppException.badRequest("error.contract.termination.request.conflicting_pending_renewal");
        }
        if (contract.getStatus() == ContractStatus.PENDING_TERMINATION_APPROVAL) {
            throw AppException.badRequest("error.contract.termination.request.conflicting_pending_termination");
        }
        if (contract.getStatus() != ContractStatus.ACTIVE && contract.getStatus() != ContractStatus.SUSPENDED) {
            throw AppException.badRequest("Only ACTIVE or SUSPENDED contracts can be terminated");
        }
        // Persist proposed handover data (these stay as proposals while pending; finalised on approval).
        contract.setTerminationDate(dto.getTerminationDate());
        contract.setTerminationReason(dto.getTerminationReason());
        contract.setTerminationDepositReturn(dto.getSecurityDepositReturnToTenant());
        contract.setTerminationHasDamages(dto.getHasDamages());
        if (Boolean.TRUE.equals(dto.getHasDamages())) {
            contract.setTerminationDamagesAmount(dto.getDamagesAmount());
            contract.setTerminationDamagesTenantPaid(dto.getDamagesPaidByTenant());
        } else {
            contract.setTerminationDamagesAmount(null);
            contract.setTerminationDamagesTenantPaid(false);
        }
        contract.setTerminationRequestedBy(terminatedByUserId);
        contract.setTerminationRequestedAt(LocalDateTime.now());
        contract.setTerminationRequestNotes(dto.getTerminationReason());
        contract.setStatus(ContractStatus.PENDING_TERMINATION_APPROVAL);
        appendStaffLog(contract, terminatedByUserId, "TERMINATION_REQUESTED",
                "proposed " + dto.getTerminationDate() + " | " + safeReason(dto.getTerminationReason()));
        LeaseContract saved = contractRepository.save(contract);
        notifyOwnersOfTerminationRequest(saved);
        tenantPortalWelcomeService.notifyTenantTerminationRequested(saved);
        return toResponse(saved);
    }

    /**
     * Staff withdraw a pending termination request before the owner decides. Reverts the
     * contract to {@link ContractStatus#ACTIVE} and clears the proposed handover values.
     */
    @Transactional
    public ContractResponse cancelTerminationRequest(Long id, Long actorUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot cancel termination requests from this screen");
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.PENDING_TERMINATION_APPROVAL) {
            throw AppException.badRequest("Contract is not awaiting termination approval");
        }
        clearProposedTerminationFields(contract);
        contract.setStatus(ContractStatus.ACTIVE);
        appendStaffLog(contract, actorUserId, "TERMINATION_REQUEST_CANCELLED", "withdrawn by staff");
        LeaseContract saved = contractRepository.save(contract);
        return toResponse(saved);
    }

    /**
     * Owner approval finalises a pending termination request. Called from
     * {@link OwnerApprovalService#processTerminationDecision}.
     */
    @Transactional
    public ContractResponse finalizeTerminationApproval(Long id, Long ownerUserId, String ownerNotes) {
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.PENDING_TERMINATION_APPROVAL) {
            throw AppException.badRequest("Contract is not awaiting termination approval");
        }
        contract.setStatus(ContractStatus.TERMINATED);
        contract.setTerminatedBy(ownerUserId);
        contract.setTerminationDecisionBy(ownerUserId);
        contract.setTerminationDecisionAt(LocalDateTime.now());
        contract.setTerminationDecisionNotes(ownerNotes);
        appendStaffLog(contract, ownerUserId, "TERMINATION_APPROVED", safeReason(ownerNotes));
        LocalDate effectiveDate = contract.getTerminationDate() != null
                ? contract.getTerminationDate() : LocalDate.now();
        scheduleRepository.waiveRemainingSchedule(id, effectiveDate);
        Long unitId = contract.getUnitId();
        LeaseContract saved = contractRepository.save(contract);
        syncUnitRentedFromContracts(unitId);
        tenantPortalWelcomeService.notifyTenantTerminationDecided(saved, true, ownerNotes);
        tenantPortalWelcomeService.notifyAccountantsOfTerminationDecision(saved, true, ownerNotes);
        return toResponse(saved);
    }

    /**
     * Owner rejection reverts a pending termination request. Called from
     * {@link OwnerApprovalService#processTerminationDecision}.
     */
    @Transactional
    public ContractResponse finalizeTerminationRejection(Long id, Long ownerUserId, String ownerNotes) {
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.PENDING_TERMINATION_APPROVAL) {
            throw AppException.badRequest("Contract is not awaiting termination approval");
        }
        contract.setTerminationDecisionBy(ownerUserId);
        contract.setTerminationDecisionAt(LocalDateTime.now());
        contract.setTerminationDecisionNotes(ownerNotes);
        clearProposedTerminationFields(contract);
        contract.setStatus(ContractStatus.ACTIVE);
        appendStaffLog(contract, ownerUserId, "TERMINATION_REJECTED", safeReason(ownerNotes));
        LeaseContract saved = contractRepository.save(contract);
        tenantPortalWelcomeService.notifyTenantTerminationDecided(saved, false, ownerNotes);
        tenantPortalWelcomeService.notifyAccountantsOfTerminationDecision(saved, false, ownerNotes);
        return toResponse(saved);
    }

    /**
     * Notifies all owner-portal users of the property's owners that a termination request
     * was just submitted. Failures are swallowed so a notification glitch never blocks the request.
     */
    public void notifyOwnersOfTerminationRequest(LeaseContract contract) {
        if (contract == null || contract.getPropertyId() == null) return;
        try {
            List<Long> recipients = propertyOwnerPortalRecipientService
                    .portalRecipientUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) return;
            String unitNumber = contract.getUnitId() != null
                    ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("—")
                    : "—";
            String propertyName = propertyRepository.findById(contract.getPropertyId())
                    .map(Property::getPropertyName).orElse("—");
            String tenantName = contract.getTenantId() != null
                    ? tenantRepository.findById(contract.getTenantId()).map(Tenant::getFullName).orElse("—")
                    : "—";
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
            vars.put("tenantName", tenantName);
            vars.put("unitNumber", unitNumber);
            vars.put("propertyName", propertyName);
            vars.put("terminationDate", contract.getTerminationDate() != null
                    ? contract.getTerminationDate().toString() : "—");
            vars.put("terminationReason",
                    contract.getTerminationReason() != null ? contract.getTerminationReason() : "—");
            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("contractId", contract.getId());
            notificationService.createLocalized(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_TERMINATION_REQUESTED,
                    "NOTIFICATIONS.CONTRACT_TERMINATION_REQUESTED_TITLE",
                    "NOTIFICATIONS.CONTRACT_TERMINATION_REQUESTED_BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // Notification side-effect must not roll back the termination request transaction.
        }
    }

    private static String safeReason(String reason) {
        return reason == null || reason.isBlank() ? "(no notes)" : reason.trim();
    }

    private void clearProposedTerminationFields(LeaseContract contract) {
        contract.setTerminationDate(null);
        contract.setTerminationReason(null);
        contract.setTerminationDepositReturn(null);
        contract.setTerminationHasDamages(null);
        contract.setTerminationDamagesAmount(null);
        contract.setTerminationDamagesTenantPaid(null);
    }

    private void clearRenewalRequestFields(LeaseContract contract, boolean clearDecisionMeta) {
        contract.setRenewalRequestedBy(null);
        contract.setRenewalRequestedAt(null);
        contract.setRenewalRequestedNote(null);
        contract.setRenewalProposedStartDate(null);
        contract.setRenewalProposedEndDate(null);
        contract.setRenewalProposedRentAmount(null);
        if (clearDecisionMeta) {
            contract.setRenewalDecisionBy(null);
            contract.setRenewalDecisionAt(null);
            contract.setRenewalDecisionNote(null);
            contract.setRenewalDecisionStatus(null);
        }
    }

    private void generatePaymentSchedule(LeaseContract contract) {
        int day = contract.getPaymentDay();
        if (day < 1 || day > 28) day = 1;

        LocalDate currentDate = contract.getStartDate().withDayOfMonth(day);
        if (currentDate.isBefore(contract.getStartDate())) {
            currentDate = currentDate.plusMonths(1);
        }

        while (!currentDate.isAfter(contract.getEndDate())) {
            LocalDate periodEnd = nextPeriodEnd(currentDate, contract.getPaymentFrequency());

            RentPaymentSchedule schedule = RentPaymentSchedule.builder()
                    .contractId(contract.getId())
                    .dueDate(currentDate)
                    .amount(calculateInstallmentAmount(contract))
                    .periodFrom(currentDate)
                    .periodTo(periodEnd.isAfter(contract.getEndDate()) ? contract.getEndDate() : periodEnd)
                    .status(PaymentScheduleStatus.PENDING)
                    .build();
            scheduleRepository.save(schedule);

            currentDate = advanceByFrequency(currentDate, contract.getPaymentFrequency());
        }
    }

    private BigDecimal calculateInstallmentAmount(LeaseContract contract) {
        return switch (contract.getPaymentFrequency()) {
            case MONTHLY -> contract.getMonthlyRent();
            case QUARTERLY -> contract.getMonthlyRent().multiply(BigDecimal.valueOf(3));
            case SEMI_ANNUAL -> contract.getMonthlyRent().multiply(BigDecimal.valueOf(6));
            case ANNUAL -> contract.getMonthlyRent().multiply(BigDecimal.valueOf(12));
        };
    }

    private LocalDate nextPeriodEnd(LocalDate from, PaymentFrequency freq) {
        return switch (freq) {
            case MONTHLY -> from.plusMonths(1).minusDays(1);
            case QUARTERLY -> from.plusMonths(3).minusDays(1);
            case SEMI_ANNUAL -> from.plusMonths(6).minusDays(1);
            case ANNUAL -> from.plusYears(1).minusDays(1);
        };
    }

    private LocalDate advanceByFrequency(LocalDate from, PaymentFrequency freq) {
        return switch (freq) {
            case MONTHLY -> from.plusMonths(1);
            case QUARTERLY -> from.plusMonths(3);
            case SEMI_ANNUAL -> from.plusMonths(6);
            case ANNUAL -> from.plusYears(1);
        };
    }

    public LeaseContract findById(Long id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + id));
    }

    public ContractResponse toResponse(LeaseContract c) {
        String tenantName = c.getTenantId() != null
                ? tenantRepository.findById(c.getTenantId()).map(t -> t.getFullName()).orElse(null)
                : null;
        String unitNumber = c.getUnitId() != null
                ? unitRepository.findById(c.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;
        String propertyName = c.getPropertyId() != null
                ? propertyRepository.findById(c.getPropertyId()).map(p -> p.getPropertyName()).orElse(null)
                : null;
        String ownerName = c.getOwnerId() != null
                ? ownerRepository.findById(c.getOwnerId()).map(o -> o.getFullName()).orElse(null)
                : null;

        long daysUntilExpiry = c.getEndDate() != null
                ? ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate())
                : 0;

        return ContractResponse.builder()
                .id(c.getId())
                .contractNumber(c.getContractNumber())
                .tenantId(c.getTenantId())
                .tenantName(tenantName)
                .unitId(c.getUnitId())
                .unitNumber(unitNumber)
                .propertyId(c.getPropertyId())
                .propertyName(propertyName)
                .ownerId(c.getOwnerId())
                .ownerName(ownerName)
                .templateId(c.getTemplateId())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .signingDate(c.getSigningDate())
                .monthlyRent(c.getMonthlyRent())
                .annualRent(c.getAnnualRent())
                .securityDeposit(c.getSecurityDeposit())
                .paymentFrequency(c.getPaymentFrequency() != null ? c.getPaymentFrequency().name() : null)
                .paymentDay(c.getPaymentDay())
                .currency(c.getCurrency())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .autoRenewable(c.isAutoRenewable())
                .renewalNoticeDays(c.getRenewalNoticeDays())
                .contractPdfUrl(c.getContractPdfUrl())
                .signedPdfUrl(c.getSignedPdfUrl())
                .terminationDate(c.getTerminationDate())
                .terminationReason(c.getTerminationReason())
                .terminatedBy(c.getTerminatedBy())
                .terminatedByName(resolveUserName(c.getTerminatedBy()))
                .terminationDepositReturn(c.getTerminationDepositReturn())
                .terminationHasDamages(c.getTerminationHasDamages())
                .terminationDamagesAmount(c.getTerminationDamagesAmount())
                .terminationDamagesTenantPaid(c.getTerminationDamagesTenantPaid())
                .terminationRequestedBy(c.getTerminationRequestedBy())
                .terminationRequestedByName(resolveUserName(c.getTerminationRequestedBy()))
                .terminationRequestedAt(c.getTerminationRequestedAt())
                .terminationRequestNotes(c.getTerminationRequestNotes())
                .terminationDecisionBy(c.getTerminationDecisionBy())
                .terminationDecisionByName(resolveUserName(c.getTerminationDecisionBy()))
                .terminationDecisionAt(c.getTerminationDecisionAt())
                .terminationDecisionNotes(c.getTerminationDecisionNotes())
                .renewalRequestedBy(c.getRenewalRequestedBy())
                .renewalRequestedByName(resolveUserName(c.getRenewalRequestedBy()))
                .renewalRequestedAt(c.getRenewalRequestedAt())
                .renewalRequestedNote(c.getRenewalRequestedNote())
                .renewalProposedStartDate(c.getRenewalProposedStartDate())
                .renewalProposedEndDate(c.getRenewalProposedEndDate())
                .renewalProposedRentAmount(c.getRenewalProposedRentAmount())
                .renewalDecisionBy(c.getRenewalDecisionBy())
                .renewalDecisionByName(resolveUserName(c.getRenewalDecisionBy()))
                .renewalDecisionAt(c.getRenewalDecisionAt())
                .renewalDecisionNote(c.getRenewalDecisionNote())
                .renewalDecisionStatus(c.getRenewalDecisionStatus())
                .notes(c.getNotes())
                .freeMonths(c.getFreeMonths())
                .hasFreeMonth(c.getHasFreeMonth())
                .rentDiscountReason(c.getRentDiscountReason())
                .otherReasonText(c.getOtherReasonText())
                .ownerApprovalStatus(c.getOwnerApprovalStatus())
                .ownerApprovalNotes(c.getOwnerApprovalNotes())
                .ownerChangeLog(c.getOwnerChangeLog())
                .staffChangeLog(c.getStaffChangeLog())
                .daysUntilExpiry(daysUntilExpiry)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .createdBy(c.getCreatedByUserId())
                .createdByName(resolveUserName(c.getCreatedByUserId()))
                .approvedBy(c.getApprovedBy())
                .approvedByName(resolveUserName(c.getApprovedBy()))
                .modifiedBy(c.getModifiedBy())
                .modifiedByName(resolveUserName(c.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private ContractSummaryDto toSummary(LeaseContract c) {
        String tenantName = c.getTenantId() != null
                ? tenantRepository.findById(c.getTenantId()).map(t -> t.getFullName()).orElse(null)
                : null;
        String unitNumber = c.getUnitId() != null
                ? unitRepository.findById(c.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;
        String propertyName = c.getPropertyId() != null
                ? propertyRepository.findById(c.getPropertyId()).map(p -> p.getPropertyName()).orElse(null)
                : null;

        long daysUntilExpiry = c.getEndDate() != null
                ? ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate())
                : 0;

        return ContractSummaryDto.builder()
                .id(c.getId())
                .contractNumber(c.getContractNumber())
                .propertyId(c.getPropertyId())
                .tenantId(c.getTenantId())
                .tenantName(tenantName)
                .unitId(c.getUnitId())
                .unitNumber(unitNumber)
                .propertyName(propertyName)
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .monthlyRent(c.getMonthlyRent())
                .currency(c.getCurrency())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .daysUntilExpiry(daysUntilExpiry)
                .build();
    }
}
