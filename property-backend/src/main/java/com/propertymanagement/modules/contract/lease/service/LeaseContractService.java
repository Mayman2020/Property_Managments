package com.propertymanagement.modules.contract.lease.service;

import com.propertymanagement.modules.contract.lease.dto.*;
import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.service.TenantPortalWelcomeService;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.tenantportal.repository.ContractActionRequestRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.contract.renewal.service.ContractRenewalService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.security.PropertyScopeService;
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
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.PaymentFrequency;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentRepository;
import com.propertymanagement.modules.contract.renewal.repository.ContractRenewalRepository;
import com.propertymanagement.modules.contract.fee.entity.ContractFee;
import com.propertymanagement.modules.contract.fee.repository.ContractFeeRepository;
import com.propertymanagement.modules.contract.lease.dto.NoRenewalIntentDto;
import com.propertymanagement.modules.contract.lease.dto.ReportDamagesDto;
import com.propertymanagement.modules.contract.lease.dto.ConfirmDamagePaymentDto;
import com.propertymanagement.modules.finance.expense.entity.Expense;
import com.propertymanagement.modules.finance.expense.repository.ExpenseCategoryLookupRepository;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.finance.revenue.entity.OtherRevenue;
import com.propertymanagement.modules.finance.revenue.entity.RevenueCategory;
import com.propertymanagement.modules.finance.revenue.repository.OtherRevenueWriterRepository;
import com.propertymanagement.modules.finance.revenue.repository.RevenueCategoryRepository;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.inspection.service.UnitInspectionService;
import com.propertymanagement.modules.vacancy.service.VacancyPublishingService;

@Service
@RequiredArgsConstructor
public class LeaseContractService {

    private static final List<ContractStatus> UNIT_LIVE_LEASE_STATUSES = List.of(
            ContractStatus.ACTIVE,
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
    private final PropertyScopeService propertyScopeService;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final ContractActionRequestRepository actionRequestRepository;
    private final OtherRevenueWriterRepository revenueWriterRepository;
    private final RevenueCategoryRepository revenueCategoryRepository;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final ExpenseCategoryLookupRepository expenseCategoryLookupRepository;
    private final VacancyPublishingService vacancyPublishingService;
    private final UnitInspectionService unitInspectionService;

    public Page<ContractResponse> getAll(Pageable pageable) {
        return search(pageable, null, null, null);
    }

    public Page<ContractResponse> getByStatus(ContractStatus status, Pageable pageable) {
        return search(pageable, status, null, null);
    }

    public Page<ContractResponse> search(
            Pageable pageable, ContractStatus status, String ownerApprovalStatus, String q) {
        String trimmedOwner = trimToNull(ownerApprovalStatus);
        String trimmedQ = trimToNull(q);
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        Page<LeaseContract> page;
        if (scope != null) {
            if (scope.isEmpty()) {
                return Page.empty(pageable);
            }
            page = contractRepository.searchInPropertyIds(scope, status, trimmedOwner, trimmedQ, pageable);
        } else {
            page = contractRepository.search(status, trimmedOwner, trimmedQ, pageable);
        }
        return page.map(this::toResponse);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public ContractResponse getById(Long id) {
        LeaseContract contract = findById(id);
        if (!propertyScopeService.canAccessProperty(contract.getPropertyId())) {
            throw AppException.forbidden("You do not have access to this property");
        }
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
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (scope == null) {
            return list;
        }
        return list.stream()
                .filter(s -> s.getPropertyId() != null && scope.contains(s.getPropertyId()))
                .collect(Collectors.toList());
    }

    /**
     * Appends one staff-change line (timestamp | actor | action | detail). Exposed for owner-portal
     * and approval flows that mutate the contract outside this service's main methods.
     */
    public void appendStaffChange(LeaseContract contract, Long actorUserId, String action, String detail) {
        appendStaffLog(contract, actorUserId, action, detail);
    }

    @Transactional
    public ContractResponse create(CreateContractDto dto, Long actingUserId) {
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
                .escalationType(dto.getEscalationType() != null ? dto.getEscalationType() : "NONE")
                .escalationRate(dto.getEscalationRate() != null ? dto.getEscalationRate() : BigDecimal.ZERO)
                .notes(dto.getNotes())
                .hasFreeMonth(Boolean.TRUE.equals(dto.getHasFreeMonth()))
                .rentDiscountReason(dto.getRentDiscountReason())
                .otherReasonText(dto.getOtherReasonText())
                .status(ContractStatus.DRAFT)
                .build();

        appendStaffLog(contract, actingUserId, "DRAFT_CREATED", "draft " + contractNumber);
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
            // NotificationEntity side-effect must not roll back the contract creation transaction.
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
    public ContractResponse submitForOwnerApproval(Long id, Long actingUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot submit contracts for approval");
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw AppException.badRequest("Only DRAFT contracts can be submitted for owner approval");
        }
        if (contract.getOwnerId() == null && contract.getPropertyId() == null) {
            throw AppException.badRequest("Contract has no owner or property linked");
        }
        contract.setStatus(ContractStatus.PENDING_OWNER_APPROVAL);
        contract.setOwnerApprovalStatus("PENDING");
        contract.setOwnerApprovalNotes(null);
        appendStaffLog(contract, actingUserId, "SUBMITTED_FOR_OWNER_APPROVAL", "awaiting owner");
        LeaseContract saved = contractRepository.save(contract);
        syncUnitRentedFromContracts(saved.getUnitId());
        notifyOwnersOfDraftContract(saved);
        return toResponse(saved);
    }

    @Transactional
    public ContractResponse activate(Long id, Long approvedByUserId) {
        // Acquire a row-level exclusive lock on the contract itself first to
        // prevent two concurrent activation requests for the same contract.
        LeaseContract contract = contractRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + id));
        if (contract.getStatus() != ContractStatus.DRAFT
                && contract.getStatus() != ContractStatus.PENDING_OWNER_APPROVAL) {
            throw AppException.badRequest("Only DRAFT or owner-pending contracts can be activated");
        }
        // Acquire a row-level exclusive lock on the unit to prevent two concurrent
        // activations for different contracts on the same unit from both succeeding.
        if (contract.getUnitId() != null) {
            unitRepository.findByIdForUpdate(contract.getUnitId());   // holds unit lock for transaction duration
            long activeLiveContracts = contractRepository.countByUnitIdAndStatusIn(
                    contract.getUnitId(), UNIT_LIVE_LEASE_STATUSES);
            if (activeLiveContracts > 0) {
                throw AppException.conflict(
                        "Unit already has an active contract. Terminate or expire the existing contract first.",
                        "UNIT_ALREADY_OCCUPIED");
            }
        }
        User acting = userRepository.findById(approvedByUserId).orElse(null);
        if (acting != null && acting.getRole() == UserRole.OWNER) {
            ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        }
        // Block activation if owner has explicitly rejected this contract (non-SUPER_ADMIN only)
        boolean isOwnerRejected = "REJECTED".equals(contract.getOwnerApprovalStatus());
        boolean isSuperAdmin = acting != null && acting.getRole() == UserRole.SUPER_ADMIN;
        if (isOwnerRejected && !isSuperAdmin) {
            throw AppException.badRequest(
                    "Cannot activate a contract that the owner has rejected. The owner must re-approve it first.",
                    "OWNER_REJECTED_CONTRACT");
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
        recordDepositAsIncome(contract);
        tenantPortalWelcomeService.notifyLeaseActivated(findById(contractId));
    }

    /** Creates an OtherRevenue entry for the security deposit when a contract is activated. */
    private void recordDepositAsIncome(LeaseContract contract) {
        if (contract == null) return;
        if (Boolean.TRUE.equals(contract.getDepositIncomeRecorded())) return;
        BigDecimal deposit = contract.getSecurityDeposit();
        if (deposit == null || deposit.compareTo(BigDecimal.ZERO) <= 0) return;
        try {
            Long categoryId = revenueCategoryRepository.findByCategoryCode("REV-DEPOSIT")
                    .map(RevenueCategory::getId).orElse(null);
            String unitNum = contract.getUnitId() != null
                    ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("") : "";
            String revNum = "REV-DEP-" + contract.getId();
            OtherRevenue revenue = OtherRevenue.builder()
                    .revenueNumber(revNum)
                    .propertyId(contract.getPropertyId())
                    .categoryId(categoryId)
                    .tenantId(contract.getTenantId())
                    .contractId(contract.getId())
                    .description("تأمين عقد " + contract.getContractNumber() + " وحدة " + unitNum)
                    .amount(deposit)
                    .currency(contract.getCurrency() != null ? contract.getCurrency() : "OMR")
                    .revenueDate(contract.getStartDate() != null ? contract.getStartDate() : LocalDate.now())
                    .notes("Security deposit — contract " + contract.getContractNumber())
                    .createdAt(LocalDateTime.now())
                    .build();
            revenueWriterRepository.save(revenue);
            contract.setDepositIncomeRecorded(true);
            contractRepository.save(contract);
        } catch (Exception e) {
            // Never block activation for a finance side-effect failure.
        }
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
        notifyLifecycleEvent(saved, actorUserId,
                "NOTIFICATIONS.CONTRACT_CANCELLED_TITLE",
                "NOTIFICATIONS.CONTRACT_CANCELLED_BODY",
                detail,
                NotificationType.GENERAL);
        return toResponse(saved);
    }

    /**
     * Sets {@link com.propertymanagement.modules.unit.Unit#rented} from ACTIVE leases
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
            if (u.isRented() || u.isReserved()) {
                vacancyPublishingService.unpublishIfUnitOccupied(unitId);
            }
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

        // Auto-compute escalated rent if not explicitly provided and escalation is configured
        BigDecimal proposedRent = dto.getProposedRentAmount();
        if (proposedRent == null && contract.getEscalationRate() != null
                && contract.getEscalationRate().compareTo(BigDecimal.ZERO) > 0) {
            String escalationType = contract.getEscalationType();
            if ("PERCENTAGE".equalsIgnoreCase(escalationType)) {
                proposedRent = contract.getMonthlyRent()
                        .multiply(BigDecimal.ONE.add(contract.getEscalationRate().divide(new BigDecimal("100"))))
                        .setScale(2, java.math.RoundingMode.HALF_UP);
            } else if ("FIXED_AMOUNT".equalsIgnoreCase(escalationType)) {
                proposedRent = contract.getMonthlyRent().add(contract.getEscalationRate()).setScale(2, java.math.RoundingMode.HALF_UP);
            }
        }

        contract.setRenewalRequestedBy(requesterUserId);
        contract.setRenewalRequestedAt(LocalDateTime.now());
        contract.setRenewalRequestedNote(dto.getNote());
        contract.setRenewalProposedStartDate(dto.getProposedStartDate());
        contract.setRenewalProposedEndDate(dto.getProposedEndDate());
        contract.setRenewalProposedRentAmount(proposedRent);
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
        markLatestActionRequestDecided(source.getId(), "RENEWAL", "APPROVED", ownerNotes, ownerUserId);
        notifyOwnersOfRenewalDecision(source, ownerUserId, true, ownerNotes);
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
        markLatestActionRequestDecided(saved.getId(), "RENEWAL", "REJECTED", ownerNotes, ownerUserId);
        notifyOwnersOfRenewalDecision(saved, ownerUserId, false, ownerNotes);
        return toResponse(saved);
    }

    /**
     * Scheduler hook: when an ACTIVE contract rolls to EXPIRED, fan-out to tenant + owner + accountants.
     */
    public void notifyContractExpired(LeaseContract contract) {
        notifyLifecycleEvent(contract, null,
                "NOTIFICATIONS.CONTRACT_EXPIRED_TITLE",
                "NOTIFICATIONS.CONTRACT_EXPIRED_BODY",
                null,
                NotificationType.CONTRACT_EXPIRING);
    }

    public void notifyOwnersOfRenewalRequest(LeaseContract contract) {
        if (contract == null || contract.getPropertyId() == null) return;
        try {
            Set<Long> recipients = new LinkedHashSet<>(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            recipients.addAll(collectAdminApprovalUserIds());
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.remove(null);
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
                    recipients.stream().toList(),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_RENEWAL_REQUESTED,
                    "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REQUESTED.TITLE",
                    "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REQUESTED.BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not roll back the renewal request transaction.
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
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw AppException.badRequest("Only ACTIVE contracts can be terminated");
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
        vacancyPublishingService.autoPublishFromContract(saved);
        tenantPortalWelcomeService.notifyTenantTerminationDecided(saved, true, ownerNotes);
        tenantPortalWelcomeService.notifyAccountantsOfTerminationDecision(saved, true, ownerNotes);
        markLatestActionRequestDecided(saved.getId(), "TERMINATION", "APPROVED", ownerNotes, ownerUserId);
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
        markLatestActionRequestDecided(saved.getId(), "TERMINATION", "REJECTED", ownerNotes, ownerUserId);
        return toResponse(saved);
    }

    /**
     * Notifies all owner-portal users of the property's owners that a termination request
     * was just submitted. Failures are swallowed so a notification glitch never blocks the request.
     */
    public void notifyOwnersOfTerminationRequest(LeaseContract contract) {
        if (contract == null || contract.getPropertyId() == null) return;
        try {
            Set<Long> recipients = new LinkedHashSet<>(propertyOwnerPortalRecipientService
                    .portalRecipientUserIds(contract.getPropertyId()));
            recipients.addAll(collectAdminApprovalUserIds());
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.remove(null);
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
                    recipients.stream().toList(),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_TERMINATION_REQUESTED,
                    "NOTIFICATIONS.CONTRACT_TERMINATION_REQUESTED_TITLE",
                    "NOTIFICATIONS.CONTRACT_TERMINATION_REQUESTED_BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not roll back the termination request transaction.
        }
    }

    private void notifyOwnersOfRenewalDecision(LeaseContract contract,
                                               Long actorOwnerUserId,
                                               boolean approved,
                                               String ownerNotes) {
        if (contract == null || contract.getPropertyId() == null) return;
        try {
            List<Long> recipients = propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId())
                    .stream()
                    .filter(id -> id != null && !Objects.equals(id, actorOwnerUserId))
                    .toList();
            if (recipients.isEmpty()) return;

            Map<String, Object> vars = buildLifecycleVars(contract, ownerNotes);
            String bodyKey = approved
                    ? "NOTIFICATIONS.OWNER_CONTRACT_RENEWAL_APPROVED_BODY"
                    : "NOTIFICATIONS.OWNER_CONTRACT_RENEWAL_REJECTED_BODY";
            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("contractId", contract.getId());
            notificationService.createLocalized(
                    recipients,
                    actorOwnerUserId,
                    contract.getPropertyId(),
                    null,
                    approved ? NotificationType.CONTRACT_RENEWAL_APPROVED : NotificationType.CONTRACT_RENEWAL_REJECTED,
                    "NOTIFICATIONS.OWNER_CONTRACT_RENEWAL_DECISION_TITLE",
                    bodyKey,
                    vars,
                    hints);
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block decision persistence.
        }
    }

    private void notifyLifecycleEvent(LeaseContract contract,
                                      Long actorUserId,
                                      String titleKey,
                                      String bodyKey,
                                      String notes,
                                      NotificationType type) {
        if (contract == null) return;
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            Long tenantUserId = resolveTenantUserId(contract);
            if (tenantUserId != null) recipients.add(tenantUserId);
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            if (contract.getPropertyId() != null) {
                recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            }
            recipients.remove(null);
            if (recipients.isEmpty()) return;

            Map<String, Object> vars = buildLifecycleVars(contract, notes);
            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("contractId", contract.getId());
            notificationService.createLocalized(
                    recipients.stream().toList(),
                    actorUserId,
                    contract.getPropertyId(),
                    null,
                    type,
                    titleKey,
                    bodyKey,
                    vars,
                    hints);
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block contract lifecycle updates.
        }
    }

    private Map<String, Object> buildLifecycleVars(LeaseContract contract, String notes) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("unitNumber", contract.getUnitId() != null
                ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("—")
                : "—");
        vars.put("propertyName", contract.getPropertyId() != null
                ? propertyRepository.findById(contract.getPropertyId()).map(Property::getPropertyName).orElse("—")
                : "—");
        vars.put("tenantName", contract.getTenantId() != null
                ? tenantRepository.findById(contract.getTenantId()).map(Tenant::getFullName).orElse("—")
                : "—");
        vars.put("notes", notes != null && !notes.isBlank() ? notes.trim() : "—");
        return vars;
    }

    private Long resolveTenantUserId(LeaseContract contract) {
        if (contract.getTenantId() == null) return null;
        return tenantRepository.findById(contract.getTenantId()).map(Tenant::getUserId).orElse(null);
    }

    private void markLatestActionRequestDecided(Long contractId,
                                                String actionType,
                                                String status,
                                                String notes,
                                                Long reviewerUserId) {
        if (contractId == null || actionType == null || status == null) {
            return;
        }
        actionRequestRepository
                .findByContractIdAndActionTypeAndStatusOrderByCreatedAtDesc(contractId, actionType, "PENDING")
                .stream()
                .findFirst()
                .ifPresent(request -> {
                    request.setStatus(status);
                    request.setAdminNotes(notes);
                    request.setReviewedBy(reviewerUserId);
                    request.setReviewedAt(LocalDateTime.now());
                    actionRequestRepository.save(request);
                });
    }

    private List<Long> collectAdminApprovalUserIds() {
        Set<Long> ids = new LinkedHashSet<>();
        userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream()
                .map(User::getId)
                .filter(Objects::nonNull)
                .forEach(ids::add);
        userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                .map(User::getId)
                .filter(Objects::nonNull)
                .forEach(ids::add);
        return ids.stream().toList();
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
        int day = contract.getPaymentDay() != null ? contract.getPaymentDay() : 1;
        if (day < 1 || day > 28) day = 1;

        LocalDate leaseStart = contract.getStartDate();
        LocalDate leaseEnd = contract.getEndDate();
        LocalDate today = LocalDate.now();

        YearMonth leaseStartYm = YearMonth.from(leaseStart);
        YearMonth todayYm = YearMonth.from(today);
        // First billing month: within the lease, and not before the calendar month of activation.
        YearMonth firstBillYm = leaseStartYm.isAfter(todayYm) ? leaseStartYm : todayYm;

        LocalDate currentDate = firstDueOnOrAfter(firstBillYm, day, leaseStart);
        int freeMonths = contract.getFreeMonths() != null ? Math.max(0, contract.getFreeMonths()) : 0;
        int installmentIndex = 0;

        while (!currentDate.isAfter(leaseEnd)) {
            LocalDate periodEnd = nextPeriodEnd(currentDate, contract.getPaymentFrequency());

            BigDecimal baseAmount = calculateInstallmentAmount(contract);
            boolean isFree = installmentIndex < freeMonths;
            BigDecimal amount = isFree ? BigDecimal.ZERO : baseAmount;
            PaymentScheduleStatus status = isFree ? PaymentScheduleStatus.WAIVED : PaymentScheduleStatus.PENDING;

            RentPaymentSchedule schedule = RentPaymentSchedule.builder()
                    .contractId(contract.getId())
                    .dueDate(currentDate)
                    .amount(amount)
                    .periodFrom(currentDate)
                    .periodTo(periodEnd.isAfter(leaseEnd) ? leaseEnd : periodEnd)
                    .status(status)
                    .build();
            scheduleRepository.save(schedule);

            installmentIndex++;
            currentDate = advanceByFrequency(currentDate, contract.getPaymentFrequency());
        }
    }

    /**
     * First due date on {@code paymentDay} in {@code ym}, never before {@code leaseStart}
     * (e.g. lease begins mid-month after the nominal payment day).
     */
    private static LocalDate firstDueOnOrAfter(YearMonth ym, int paymentDay, LocalDate leaseStart) {
        int dom = Math.min(paymentDay, ym.lengthOfMonth());
        LocalDate due = ym.atDay(dom);
        if (!due.isBefore(leaseStart)) {
            return due;
        }
        return leaseStart;
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

    // ─────────────────────────────────────────────────────────────────────────
    // Expiry lifecycle: no-renewal intent, deposit return, damage, clearance
    // ─────────────────────────────────────────────────────────────────────────

    /** Tenant or staff records that the tenant does not wish to renew. */
    @Transactional
    public ContractResponse recordNoRenewalIntent(Long contractId, Long actorUserId, NoRenewalIntentDto dto) {
        LeaseContract contract = findById(contractId);
        contract.setNoRenewalIntentAt(LocalDateTime.now());
        contract.setNoRenewalIntentBy(actorUserId);
        String notes = dto != null && dto.getNotes() != null ? dto.getNotes() : "";
        appendStaffLog(contract, actorUserId, "NO_RENEWAL_INTENT", notes.isBlank() ? "عدم الرغبة في التجديد" : notes);
        LeaseContract saved = contractRepository.save(contract);
        notifyNoRenewalIntent(saved, actorUserId, notes);
        return toResponse(saved);
    }

    private void notifyNoRenewalIntent(LeaseContract contract, Long actorUserId, String notes) {
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            recipients.remove(null);
            if (recipients.isEmpty()) return;
            Map<String, Object> vars = buildLifecycleVars(contract, notes);
            notificationService.createLocalized(recipients.stream().toList(), actorUserId,
                    contract.getPropertyId(), null,
                    NotificationType.NO_RENEWAL_INTENT_SUBMITTED,
                    "NOTIFICATIONS.NO_RENEWAL_INTENT_TITLE",
                    "NOTIFICATIONS.NO_RENEWAL_INTENT_BODY",
                    vars,
                    Map.of("contractId", contract.getId()));
        } catch (Exception ignored) {}
    }

    /** Accountant returns the security deposit to the tenant — creates an Expense entry. */
    @Transactional
    public ContractResponse returnDeposit(Long contractId, Long actorUserId) {
        LeaseContract contract = findById(contractId);
        if (Boolean.TRUE.equals(contract.getDepositExpenseRecorded())) {
            throw AppException.badRequest("Deposit return already recorded for this contract");
        }
        BigDecimal deposit = contract.getSecurityDeposit();
        if (deposit == null || deposit.compareTo(BigDecimal.ZERO) <= 0) {
            throw AppException.badRequest("No security deposit amount on this contract");
        }
        Long categoryId = expenseCategoryLookupRepository.findByCategoryCode("EXP-DEPOSIT-RETURN")
                .map(c -> c.getId()).orElse(null);
        String unitNum = contract.getUnitId() != null
                ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("") : "";
        Expense expense = Expense.builder()
                .expenseNumber("EXP-DEP-" + contractId)
                .propertyId(contract.getPropertyId())
                .categoryId(categoryId)
                .description("إعادة تأمين عقد " + contract.getContractNumber() + " وحدة " + unitNum)
                .amount(deposit)
                .currency(contract.getCurrency() != null ? contract.getCurrency() : "OMR")
                .expenseDate(LocalDate.now())
                .status("PAID")
                .createdAt(LocalDateTime.now())
                .build();
        expenseWriterRepository.save(expense);
        contract.setTerminationDepositReturn(true);
        contract.setDepositExpenseRecorded(true);
        appendStaffLog(contract, actorUserId, "DEPOSIT_RETURNED", "deposit " + deposit + " " + contract.getCurrency());
        LeaseContract saved = contractRepository.save(contract);
        notifyDepositReturned(saved, actorUserId, deposit);
        return toResponse(saved);
    }

    private void notifyDepositReturned(LeaseContract contract, Long actorUserId, BigDecimal amount) {
        try {
            Long tenantUserId = resolveTenantUserId(contract);
            if (tenantUserId == null) return;
            Map<String, Object> vars = buildLifecycleVars(contract, null);
            vars.put("amount", amount.toPlainString());
            notificationService.createLocalized(List.of(tenantUserId), actorUserId,
                    contract.getPropertyId(), null,
                    NotificationType.DEPOSIT_RETURNED,
                    "NOTIFICATIONS.DEPOSIT_RETURNED_TITLE",
                    "NOTIFICATIONS.DEPOSIT_RETURNED_BODY",
                    vars,
                    Map.of("contractId", contract.getId()));
        } catch (Exception ignored) {}
    }

    /** Accountant records unit damages — tenant will be notified to pay or contest. */
    @Transactional
    public ContractResponse reportDamages(Long contractId, Long actorUserId, ReportDamagesDto dto) {
        LeaseContract contract = findById(contractId);
        contract.setTerminationHasDamages(true);
        contract.setTerminationDamagesAmount(dto.getAmount());
        contract.setTerminationDamageNotes(dto.getNotes());
        contract.setTerminationDamagesTenantPaid(false);
        appendStaffLog(contract, actorUserId, "DAMAGES_REPORTED",
                dto.getAmount() + " " + contract.getCurrency() + " — " + (dto.getNotes() != null ? dto.getNotes() : ""));
        LeaseContract saved = contractRepository.save(contract);
        notifyDamagesReported(saved, actorUserId, dto);
        return toResponse(saved);
    }

    private void notifyDamagesReported(LeaseContract contract, Long actorUserId, ReportDamagesDto dto) {
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            Long tenantUserId = resolveTenantUserId(contract);
            if (tenantUserId != null) recipients.add(tenantUserId);
            recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            recipients.remove(null);
            if (recipients.isEmpty()) return;
            Map<String, Object> vars = buildLifecycleVars(contract, dto.getNotes());
            vars.put("amount", dto.getAmount().toPlainString());
            notificationService.createLocalized(recipients.stream().toList(), actorUserId,
                    contract.getPropertyId(), null,
                    NotificationType.UNIT_DAMAGE_REPORTED,
                    "NOTIFICATIONS.DAMAGE_REPORTED_TITLE",
                    "NOTIFICATIONS.DAMAGE_REPORTED_BODY",
                    vars,
                    Map.of("contractId", contract.getId()));
        } catch (Exception ignored) {}
    }

    /** Tenant submits payment receipt for the damage amount. */
    @Transactional
    public ContractResponse submitDamagePaymentReceipt(Long contractId, Long actorUserId, String receiptUrl) {
        LeaseContract contract = findById(contractId);
        if (!Boolean.TRUE.equals(contract.getTerminationHasDamages())) {
            throw AppException.badRequest("No damages recorded on this contract");
        }
        contract.setTerminationDamagesReceiptUrl(receiptUrl);
        appendStaffLog(contract, actorUserId, "DAMAGE_RECEIPT_SUBMITTED", receiptUrl);
        LeaseContract saved = contractRepository.save(contract);
        notifyDamageReceiptSubmitted(saved, actorUserId);
        return toResponse(saved);
    }

    private void notifyDamageReceiptSubmitted(LeaseContract contract, Long actorUserId) {
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            recipients.remove(null);
            if (recipients.isEmpty()) return;
            Map<String, Object> vars = buildLifecycleVars(contract, null);
            notificationService.createLocalized(recipients.stream().toList(), actorUserId,
                    contract.getPropertyId(), null,
                    NotificationType.DAMAGE_RECEIPT_SUBMITTED,
                    "NOTIFICATIONS.DAMAGE_RECEIPT_TITLE",
                    "NOTIFICATIONS.DAMAGE_RECEIPT_BODY",
                    vars,
                    Map.of("contractId", contract.getId()));
        } catch (Exception ignored) {}
    }

    /** Accountant confirms tenant paid the damage amount — creates OtherRevenue entry. */
    @Transactional
    public ContractResponse confirmDamagePayment(Long contractId, Long actorUserId, ConfirmDamagePaymentDto dto) {
        LeaseContract contract = findById(contractId);
        if (!Boolean.TRUE.equals(contract.getTerminationHasDamages())) {
            throw AppException.badRequest("No damages recorded on this contract");
        }
        BigDecimal amount = contract.getTerminationDamagesAmount();
        Long categoryId = revenueCategoryRepository.findByCategoryCode("REV-FINE")
                .map(RevenueCategory::getId).orElse(null);
        String unitNum = contract.getUnitId() != null
                ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("") : "";
        OtherRevenue revenue = OtherRevenue.builder()
                .revenueNumber("REV-DMG-" + contractId)
                .propertyId(contract.getPropertyId())
                .categoryId(categoryId)
                .tenantId(contract.getTenantId())
                .contractId(contractId)
                .description("تلفيات وحدة " + unitNum + " عقد " + contract.getContractNumber())
                .amount(amount)
                .currency(contract.getCurrency() != null ? contract.getCurrency() : "OMR")
                .revenueDate(LocalDate.now())
                .receiptUrl(dto.getReceiptUrl())
                .recordedBy(actorUserId)
                .notes("Damage payment — contract " + contract.getContractNumber())
                .createdAt(LocalDateTime.now())
                .build();
        revenueWriterRepository.save(revenue);
        contract.setTerminationDamagesTenantPaid(true);
        if (dto.getReceiptUrl() != null) contract.setTerminationDamagesReceiptUrl(dto.getReceiptUrl());
        appendStaffLog(contract, actorUserId, "DAMAGE_PAYMENT_CONFIRMED",
                amount + " " + contract.getCurrency());
        LeaseContract saved = contractRepository.save(contract);
        notifyDamagePaymentConfirmed(saved, actorUserId);
        return toResponse(saved);
    }

    private void notifyDamagePaymentConfirmed(LeaseContract contract, Long actorUserId) {
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.remove(null);
            if (recipients.isEmpty()) return;
            Map<String, Object> vars = buildLifecycleVars(contract, null);
            notificationService.createLocalized(recipients.stream().toList(), actorUserId,
                    contract.getPropertyId(), null,
                    NotificationType.DAMAGE_PAYMENT_CONFIRMED,
                    "NOTIFICATIONS.DAMAGE_PAYMENT_CONFIRMED_TITLE",
                    "NOTIFICATIONS.DAMAGE_PAYMENT_CONFIRMED_BODY",
                    vars,
                    Map.of("contractId", contract.getId()));
        } catch (Exception ignored) {}
    }

    /** Owner or accountant marks the unit as inspected and cleared — makes it available for new leases. */
    @Transactional
    public ContractResponse clearUnit(Long contractId, Long actorUserId) {
        LeaseContract contract = findById(contractId);
        if (contract.getUnitId() == null) throw AppException.badRequest("Contract has no unit");
        // PHASE2B-DONE: TASK2 — clearUnit requires SIGNED MOVE_OUT
        if (!unitInspectionService.hasSignedMoveOut(contractId)) {
            throw AppException.badRequest("Move-out inspection must be completed before clearing unit");
        }
        unitRepository.findById(contract.getUnitId()).ifPresent(unit -> {
            unit.setRented(false);
            unit.setReserved(false);
            unit.setClearedAt(LocalDateTime.now());
            unit.setClearedBy(actorUserId);
            unit.setHasDamage(Boolean.TRUE.equals(contract.getTerminationHasDamages())
                    && !Boolean.TRUE.equals(contract.getTerminationDamagesTenantPaid()));
            if (contract.getTerminationDamageNotes() != null) {
                unit.setDamageNotes(contract.getTerminationDamageNotes());
            }
            unitRepository.save(unit);
        });
        appendStaffLog(contract, actorUserId, "UNIT_CLEARED", "unit cleared for re-listing");
        LeaseContract saved = contractRepository.save(contract);
        notifyUnitCleared(saved, actorUserId);
        return toResponse(saved);
    }

    private void notifyUnitCleared(LeaseContract contract, Long actorUserId) {
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            recipients.addAll(collectAdminApprovalUserIds());
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.remove(null);
            if (recipients.isEmpty()) return;
            Map<String, Object> vars = buildLifecycleVars(contract, null);
            notificationService.createLocalized(recipients.stream().toList(), actorUserId,
                    contract.getPropertyId(), null,
                    NotificationType.UNIT_CLEARED,
                    "NOTIFICATIONS.UNIT_CLEARED_TITLE",
                    "NOTIFICATIONS.UNIT_CLEARED_BODY",
                    vars,
                    Map.of("contractId", contract.getId()));
        } catch (Exception ignored) {}
    }

    /** Called from ContractScheduler: notify tenant + owner + accountants 3 days before expiry. */
    public void notifyContractExpiringSoon(LeaseContract contract) {
        notifyLifecycleEvent(contract, null,
                "NOTIFICATIONS.CONTRACT_EXPIRING_SOON_TITLE",
                "NOTIFICATIONS.CONTRACT_EXPIRING_SOON_BODY",
                null,
                NotificationType.CONTRACT_EXPIRING_SOON);
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
        Property property = c.getPropertyId() != null
                ? propertyRepository.findById(c.getPropertyId()).orElse(null)
                : null;
        String propertyName = property != null ? property.getPropertyName() : null;
        String propertyCoverImageUrl = property != null ? property.getCoverImageUrl() : null;
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
                .propertyCoverImageUrl(propertyCoverImageUrl)
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
                .escalationType(c.getEscalationType())
                .escalationRate(c.getEscalationRate())
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
                .noRenewalIntentAt(c.getNoRenewalIntentAt())
                .noRenewalIntentBy(c.getNoRenewalIntentBy())
                .noRenewalIntentByName(resolveUserName(c.getNoRenewalIntentBy()))
                .depositIncomeRecorded(c.getDepositIncomeRecorded())
                .depositExpenseRecorded(c.getDepositExpenseRecorded())
                .terminationDamagesReceiptUrl(c.getTerminationDamagesReceiptUrl())
                .terminationDamageNotes(c.getTerminationDamageNotes())
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
                .ownerApprovalStatus(c.getOwnerApprovalStatus())
                .daysUntilExpiry(daysUntilExpiry)
                .build();
    }
}
