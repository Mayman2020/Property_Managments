package com.propertymanagement.modules.tenant.service;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.i18n.AppMessages;
import com.propertymanagement.shared.i18n.BilingualNotificationText;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.owner.entity.Owner;

/**
 * In-app copy for tenants: unit/property assignment and (when a lease exists) contract + first due payment.
 * Copy comes from {@code messages*.properties} (see {@link BilingualNotificationText} for persisted AR/EN).
 */
@Service
@RequiredArgsConstructor
public class TenantPortalWelcomeService {

    private final AppMessages appMessages;
    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final LeaseContractRepository leaseContractRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * When a portal user is first linked to a tenant row — summary without duplicating
     * the full activation message if a lease is already ACTIVE.
     */
    public void notifyTenantPortalLinked(Tenant tenant) {
        if (tenant == null || tenant.getUserId() == null) {
            return;
        }
        Optional<LeaseContract> active = leaseContractRepository
                .findFirstByTenantIdAndStatusOrderByStartDateDesc(tenant.getId(), ContractStatus.ACTIVE);
        String titleAr;
        String titleEn;
        String bodyAr;
        String bodyEn;
        if (active.isPresent()) {
            var t = appMessages.bilingual("tenant.portal.notify_linked.title.with_lease");
            titleAr = t.ar();
            titleEn = t.en();
            var parts = composeBodyParts(tenant, active.get());
            bodyAr = parts.ar();
            bodyEn = parts.en();
        } else {
            var t = appMessages.bilingual("tenant.portal.notify_linked.title.basics_only");
            titleAr = t.ar();
            titleEn = t.en();
            var parts = composeBasicsOnlyParts(tenant);
            bodyAr = parts.ar();
            bodyEn = parts.en();
        }
        Long propertyId = resolvePropertyId(tenant);
        notificationService.createForRecipients(
                List.of(tenant.getUserId()),
                null,
                propertyId,
                null,
                NotificationType.GENERAL,
                BilingualNotificationText.title(titleAr, titleEn),
                BilingualNotificationText.body(bodyAr, bodyEn)
        );
    }

    /**
     * When a DRAFT (or pending-owner) lease is saved: tell the tenant the unit stays reserved
     * until the owner reviews the draft and management activates the contract.
     */
    public void notifyTenantDraftLeasePendingOwner(LeaseContract contract) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        ContractStatus st = contract.getStatus();
        if (st != ContractStatus.DRAFT && st != ContractStatus.PENDING_OWNER_APPROVAL) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            Map<String, Object> vars = buildDraftPendingTenantVars(contract, tenant);
            notificationService.createLocalized(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_DRAFT_LEASE_PENDING_OWNER,
                    "NOTIFICATIONS.TENANT_DRAFT_PENDING_OWNER_TITLE",
                    "NOTIFICATIONS.TENANT_DRAFT_PENDING_OWNER_BODY",
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block contract persistence.
        }
    }

    /**
     * Owner portal: draft cancelled — tenant sees reason (bilingual body from {@code messages*.properties}).
     */
    public void notifyTenantOwnerRejectedLease(LeaseContract contract, String reason) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            String unitNum = currentUnitNumber(contract);
            String prop = propertyCompositeLabel(contract);
            String r = reason == null || reason.isBlank() ? "—" : reason.trim();
            String titleAr = appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_reject.title");
            String titleEn = appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_reject.title");
            String bodyAr = appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_reject.body",
                    contract.getContractNumber(), unitNum, prop, r);
            String bodyEn = appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_reject.body",
                    contract.getContractNumber(), unitNum, prop, r);
            notificationService.createForRecipients(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_LEASE_REJECTED_BY_OWNER,
                    BilingualNotificationText.title(titleAr, titleEn),
                    BilingualNotificationText.body(bodyAr, bodyEn),
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // Do not block persistence
        }
    }

    /**
     * Owner portal: draft amended (unit and/or rent). {@code changes*} are preformatted per locale from the caller.
     */
    public void notifyTenantOwnerAmendedLease(LeaseContract contract,
                                             String changesAr,
                                             String changesEn,
                                             String ownerReason) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            String unitNum = currentUnitNumber(contract);
            String prop = propertyCompositeLabel(contract);
            String reason = ownerReason == null || ownerReason.isBlank() ? "—" : ownerReason.trim();
            String titleAr = appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_amend.title");
            String titleEn = appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_amend.title");
            String bodyAr = appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_amend.body",
                    contract.getContractNumber(), unitNum, prop, changesAr, reason);
            String bodyEn = appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_amend.body",
                    contract.getContractNumber(), unitNum, prop, changesEn, reason);
            notificationService.createForRecipients(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_LEASE_AMENDED_BY_OWNER,
                    BilingualNotificationText.title(titleAr, titleEn),
                    BilingualNotificationText.body(bodyAr, bodyEn),
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // Do not block persistence
        }
    }

    /**
     * Owner declined a contract that was in {@link ContractStatus#PENDING_OWNER_APPROVAL}; it stays DRAFT with notes.
     */
    public void notifyTenantOwnerDeniedPendingApproval(LeaseContract contract, String ownerNotes) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            String unitNum = currentUnitNumber(contract);
            String prop = propertyCompositeLabel(contract);
            String notes = ownerNotes == null || ownerNotes.isBlank() ? "—" : ownerNotes.trim();
            String titleAr = appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_approval_denied.title");
            String titleEn = appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_approval_denied.title");
            String bodyAr = appMessages.get(AppMessages.LOCALE_AR, "tenant.notify.owner_approval_denied.body",
                    contract.getContractNumber(), unitNum, prop, notes);
            String bodyEn = appMessages.get(AppMessages.LOCALE_EN, "tenant.notify.owner_approval_denied.body",
                    contract.getContractNumber(), unitNum, prop, notes);
            notificationService.createForRecipients(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_LEASE_OWNER_APPROVAL_DENIED,
                    BilingualNotificationText.title(titleAr, titleEn),
                    BilingualNotificationText.body(bodyAr, bodyEn),
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // Do not block persistence
        }
    }

    /**
     * Property + global accountants are informed when the owner declines a draft so the
     * accountant who staged the lease can follow up. Mirrors {@link #notifyTenantOwnerDeniedPendingApproval}
     * but for the accountant audience.
     */
    public void notifyAccountantsOfDraftRejected(LeaseContract contract, String ownerNotes) {
        if (contract == null) {
            return;
        }
        try {
            List<Long> recipients = collectAccountantUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) {
                return;
            }
            Map<String, Object> vars = buildTerminationVars(contract, ownerNotes, /* tenantSummary */ true);
            notificationService.createLocalized(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED,
                    "NOTIFICATIONS.ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED_TITLE",
                    "NOTIFICATIONS.ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED_BODY",
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    /** Owner rejected a draft from owner portal: mirror to accountants for follow-up. */
    public void notifyAccountantsOfOwnerRejectedLease(LeaseContract contract, String ownerNotes) {
        notifyAccountantsOfDraftRejected(contract, ownerNotes);
    }

    /** Owner amended a draft from owner portal: notify accountants with change summary. */
    public void notifyAccountantsOfOwnerAmendedLease(LeaseContract contract,
                                                     String changesAr,
                                                     String changesEn,
                                                     String ownerReason) {
        if (contract == null) {
            return;
        }
        try {
            List<Long> recipients = collectAccountantUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) {
                return;
            }
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
            vars.put("unitNumber", currentUnitNumber(contract));
            vars.put("propertyName", propertyCompositeLabel(contract));
            vars.put("changes", BilingualNotificationText.composite(changesAr, changesEn, changesEn));
            vars.put("reason", ownerReason != null && !ownerReason.isBlank() ? ownerReason.trim() : "—");
            if (contract.getTenantId() != null) {
                tenantRepository.findById(contract.getTenantId()).ifPresent(t -> {
                    String tenantName = firstNonBlank(t.getFullNameAr(), t.getFullNameEn(), t.getFullName());
                    vars.put("tenantName", tenantName != null && !tenantName.isBlank() ? tenantName : "—");
                });
            }
            if (!vars.containsKey("tenantName")) {
                vars.put("tenantName", "—");
            }
            notificationService.createLocalized(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_LEASE_AMENDED_BY_OWNER,
                    "NOTIFICATIONS.ACCOUNTANT_OWNER_AMENDED_DRAFT_TITLE",
                    "NOTIFICATIONS.ACCOUNTANT_OWNER_AMENDED_DRAFT_BODY",
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    /**
     * Tenant is informed that staff submitted a termination/handover request to the owner;
     * contract effectively stays ACTIVE until the owner decides.
     */
    public void notifyTenantTerminationRequested(LeaseContract contract) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            Map<String, Object> vars = buildTerminationVars(contract, contract.getTerminationReason(), /* tenantSummary */ false);
            notificationService.createLocalized(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_CONTRACT_TERMINATION_REQUESTED,
                    "NOTIFICATIONS.TENANT_CONTRACT_TERMINATION_REQUESTED_TITLE",
                    "NOTIFICATIONS.TENANT_CONTRACT_TERMINATION_REQUESTED_BODY",
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    /**
     * Tenant is informed of the owner's decision on a pending termination request.
     * {@code approved=true} → contract is now TERMINATED; {@code approved=false} → contract reverts to ACTIVE.
     */
    public void notifyTenantTerminationDecided(LeaseContract contract, boolean approved, String ownerNotes) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            Map<String, Object> vars = buildTerminationVars(contract, ownerNotes, /* tenantSummary */ false);
            String titleKey = approved
                    ? "NOTIFICATIONS.CONTRACT_TERMINATION_APPROVED_TITLE"
                    : "NOTIFICATIONS.CONTRACT_TERMINATION_REJECTED_TITLE";
            String bodyKey = approved
                    ? "NOTIFICATIONS.CONTRACT_TERMINATION_APPROVED_TENANT_BODY"
                    : "NOTIFICATIONS.CONTRACT_TERMINATION_REJECTED_TENANT_BODY";
            NotificationType type = approved
                    ? NotificationType.CONTRACT_TERMINATION_APPROVED
                    : NotificationType.CONTRACT_TERMINATION_REJECTED;
            notificationService.createLocalized(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    type,
                    titleKey,
                    bodyKey,
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    /**
     * Property + global accountants get the final outcome of a termination request so they
     * can prep / unblock collection workflows. Mirrors {@link #notifyAccountantsOfLeaseActivation}.
     */
    public void notifyAccountantsOfTerminationDecision(LeaseContract contract,
                                                       boolean approved,
                                                       String ownerNotes) {
        if (contract == null) {
            return;
        }
        try {
            List<Long> recipients = collectAccountantUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) {
                return;
            }
            Map<String, Object> vars = buildTerminationVars(contract, ownerNotes, /* tenantSummary */ true);
            String titleKey = approved
                    ? "NOTIFICATIONS.CONTRACT_TERMINATION_APPROVED_TITLE"
                    : "NOTIFICATIONS.CONTRACT_TERMINATION_REJECTED_TITLE";
            String bodyKey = approved
                    ? "NOTIFICATIONS.CONTRACT_TERMINATION_APPROVED_ACCOUNTANT_BODY"
                    : "NOTIFICATIONS.CONTRACT_TERMINATION_REJECTED_ACCOUNTANT_BODY";
            NotificationType type = approved
                    ? NotificationType.CONTRACT_TERMINATION_APPROVED
                    : NotificationType.CONTRACT_TERMINATION_REJECTED;
            notificationService.createLocalized(
                    recipients,
                    null,
                    contract.getPropertyId(),
                    null,
                    type,
                    titleKey,
                    bodyKey,
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    public void notifyTenantRenewalRequested(LeaseContract contract) {
        if (contract == null || contract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(contract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            Map<String, Object> vars = buildRenewalVars(contract, contract.getRenewalRequestedNote(), false, null);
            notificationService.createLocalized(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.TENANT_CONTRACT_RENEWAL_REQUESTED,
                    "NOTIFICATIONS.TYPES.TENANT_CONTRACT_RENEWAL_REQUESTED.TITLE",
                    "NOTIFICATIONS.TYPES.TENANT_CONTRACT_RENEWAL_REQUESTED.BODY",
                    vars,
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    public void notifyTenantRenewalDecided(LeaseContract sourceContract,
                                           boolean approved,
                                           String ownerNotes,
                                           Long newApprovedContractId) {
        if (sourceContract == null || sourceContract.getTenantId() == null) {
            return;
        }
        try {
            Tenant tenant = tenantRepository.findById(sourceContract.getTenantId()).orElse(null);
            if (tenant == null || tenant.getUserId() == null) {
                return;
            }
            Map<String, Object> vars = buildRenewalVars(sourceContract, ownerNotes, false, newApprovedContractId);
            String bodyKey = approved
                    ? "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_APPROVED.BODY"
                    : "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REJECTED.BODY";
            NotificationType type = approved
                    ? NotificationType.CONTRACT_RENEWAL_APPROVED
                    : NotificationType.CONTRACT_RENEWAL_REJECTED;
            Map<String, Object> hints = hintsContract(newApprovedContractId != null ? newApprovedContractId : sourceContract.getId());
            notificationService.createLocalized(
                    List.of(tenant.getUserId()),
                    null,
                    sourceContract.getPropertyId(),
                    null,
                    type,
                    "NOTIFICATIONS.TYPES." + type.name() + ".TITLE",
                    bodyKey,
                    vars,
                    hints);
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    public void notifyAccountantsOfRenewalDecision(LeaseContract sourceContract,
                                                   boolean approved,
                                                   String ownerNotes,
                                                   Long newApprovedContractId) {
        if (sourceContract == null) {
            return;
        }
        try {
            List<Long> recipients = collectAccountantUserIds(sourceContract.getPropertyId());
            if (recipients.isEmpty()) {
                return;
            }
            Map<String, Object> vars = buildRenewalVars(sourceContract, ownerNotes, true, newApprovedContractId);
            NotificationType type = approved
                    ? NotificationType.ACCOUNTANT_CONTRACT_RENEWAL_APPROVED
                    : NotificationType.ACCOUNTANT_CONTRACT_RENEWAL_REJECTED;
            String keyPrefix = "NOTIFICATIONS.TYPES." + type.name();
            Map<String, Object> hints = hintsContract(newApprovedContractId != null ? newApprovedContractId : sourceContract.getId());
            notificationService.createLocalized(
                    recipients,
                    null,
                    sourceContract.getPropertyId(),
                    null,
                    type,
                    keyPrefix + ".TITLE",
                    keyPrefix + ".BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block persistence.
        }
    }

    /**
     * Variables consumed by the termination notification keys. Includes contract number,
     * tenant name (only for staff/accountant audience), unit + property labels, proposed
     * termination date, and the requester or decision notes.
     */
    private Map<String, Object> buildTerminationVars(LeaseContract contract, String notes, boolean includeTenantName) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("unitNumber", currentUnitNumber(contract));
        vars.put("propertyName", propertyCompositeLabel(contract));
        if (contract.getTerminationDate() != null) {
            vars.put("terminationDate", contract.getTerminationDate().toString());
        } else {
            vars.put("terminationDate", "—");
        }
        if (contract.getTerminationReason() != null && !contract.getTerminationReason().isBlank()) {
            vars.put("terminationReason", contract.getTerminationReason().trim());
        } else {
            vars.put("terminationReason", "—");
        }
        if (notes != null && !notes.isBlank()) {
            vars.put("notes", notes.trim());
        } else {
            vars.put("notes", "—");
        }
        if (includeTenantName && contract.getTenantId() != null) {
            tenantRepository.findById(contract.getTenantId()).ifPresent(t -> {
                String name = firstNonBlank(t.getFullNameAr(), t.getFullNameEn(), t.getFullName());
                if (name != null) {
                    vars.put("tenantName", name);
                }
            });
            if (!vars.containsKey("tenantName")) {
                vars.put("tenantName", "—");
            }
        }
        return vars;
    }

    private Map<String, Object> buildRenewalVars(LeaseContract contract,
                                                 String notes,
                                                 boolean includeTenantName,
                                                 Long approvedContractId) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("unitNumber", currentUnitNumber(contract));
        vars.put("propertyName", propertyCompositeLabel(contract));
        vars.put("proposedStartDate", contract.getRenewalProposedStartDate() != null
                ? contract.getRenewalProposedStartDate().toString() : "—");
        vars.put("proposedEndDate", contract.getRenewalProposedEndDate() != null
                ? contract.getRenewalProposedEndDate().toString() : "—");
        vars.put("proposedRentAmount", contract.getRenewalProposedRentAmount() != null
                ? contract.getRenewalProposedRentAmount().toPlainString() : "—");
        vars.put("requestNote", contract.getRenewalRequestedNote() != null
                ? contract.getRenewalRequestedNote() : "—");
        vars.put("decisionNote", notes != null && !notes.isBlank() ? notes.trim() : "—");
        if (approvedContractId != null) {
            vars.put("approvedContractId", approvedContractId);
        }
        if (includeTenantName && contract.getTenantId() != null) {
            tenantRepository.findById(contract.getTenantId()).ifPresent(t -> {
                String name = firstNonBlank(t.getFullNameAr(), t.getFullNameEn(), t.getFullName());
                if (name != null) {
                    vars.put("tenantName", name);
                }
            });
            if (!vars.containsKey("tenantName")) {
                vars.put("tenantName", "—");
            }
        }
        return vars;
    }

    private static Map<String, Object> hintsContract(Long contractId) {
        if (contractId == null) {
            return null;
        }
        Map<String, Object> m = new LinkedHashMap<>(1);
        m.put("contractId", contractId);
        return m;
    }

    private String currentUnitNumber(LeaseContract contract) {
        if (contract.getUnitId() == null) {
            return "—";
        }
        return unitRepository.findById(contract.getUnitId())
                .map(u -> safe(u.getUnitNumber()))
                .orElse("—");
    }

    private String propertyCompositeLabel(LeaseContract contract) {
        if (contract.getPropertyId() == null) {
            return "—";
        }
        return propertyRepository.findById(contract.getPropertyId())
                .map(p -> BilingualNotificationText.composite(
                        p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName()))
                .orElse("—");
    }

    /**
     * After staff activates a contract — tenant gets a notification with contract no., approval date,
     * and the first payment due. Accountants (property-scoped + global) receive the same body so they
     * can prepare for the upcoming rent collection.
     *
     * <p>Backend stays language-agnostic: it ships only ngx-translate keys + variables in
     * {@code params} so the frontend renders the final localized text from {@code i18n/*.json}.</p>
     */
    public void notifyLeaseActivated(LeaseContract contract) {
        if (contract == null) {
            return;
        }
        Tenant tenant = contract.getTenantId() != null
                ? tenantRepository.findById(contract.getTenantId()).orElse(null)
                : null;
        LocalDate approvalDate = LocalDate.now();

        if (tenant != null && tenant.getUserId() != null) {
            notificationService.createLocalized(
                    List.of(tenant.getUserId()),
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_ACTIVATED,
                    "NOTIFICATIONS.CONTRACT_ACTIVATED_TITLE",
                    "NOTIFICATIONS.CONTRACT_ACTIVATED_TENANT_BODY",
                    buildActivatedVars(contract, tenant, approvalDate, /* includeTenantName */ false),
                    hintsContract(contract.getId()));
        }

        notifyAccountantsOfLeaseActivation(contract, tenant, approvalDate);
    }

    /** Same activation summary goes to property-scoped accountants and any global accountants. */
    private void notifyAccountantsOfLeaseActivation(LeaseContract contract, Tenant tenant, LocalDate approvalDate) {
        try {
            List<Long> recipientIds = collectAccountantUserIds(contract.getPropertyId());
            if (recipientIds.isEmpty()) {
                return;
            }
            notificationService.createLocalized(
                    recipientIds,
                    null,
                    contract.getPropertyId(),
                    null,
                    NotificationType.CONTRACT_ACTIVATED,
                    "NOTIFICATIONS.CONTRACT_ACTIVATED_TITLE",
                    "NOTIFICATIONS.CONTRACT_ACTIVATED_ACCOUNTANT_BODY",
                    buildActivatedVars(contract, tenant, approvalDate, /* includeTenantName */ true),
                    hintsContract(contract.getId()));
        } catch (Exception ignored) {
            // NotificationEntity side-effect must not block contract activation.
        }
    }

    /**
     * Variables consumed by ngx-translate placeholders in the CONTRACT_ACTIVATED keys:
     * {@code contractNumber}, {@code approvalDate}, {@code unitNumber}, {@code propertyName},
     * {@code firstPaymentDate}, {@code firstPaymentAmount}, optional {@code tenantName}.
     */
    private Map<String, Object> buildActivatedVars(LeaseContract contract,
                                                   Tenant tenant,
                                                   LocalDate approvalDate,
                                                   boolean includeTenantName) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("approvalDate", approvalDate.toString());

        Long unitId = contract.getUnitId() != null ? contract.getUnitId()
                : (tenant != null ? tenant.getUnitId() : null);
        if (unitId != null) {
            unitRepository.findById(unitId)
                    .map(Unit::getUnitNumber)
                    .ifPresent(num -> vars.put("unitNumber", num));
        }
        Long propertyId = contract.getPropertyId() != null ? contract.getPropertyId()
                : (tenant != null ? resolvePropertyId(tenant) : null);
        if (propertyId != null) {
            propertyRepository.findById(propertyId).ifPresent(p -> {
                String label = BilingualNotificationText.composite(
                        p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName());
                vars.put("propertyName", label);
            });
        }
        firstPendingSchedule(contract.getId()).ifPresent(s -> {
            vars.put("firstPaymentDate", s.getDueDate().toString());
            BigDecimal amount = s.getAmount() == null ? BigDecimal.ZERO : s.getAmount();
            vars.put("firstPaymentAmount", amount.toPlainString());
        });
        if (includeTenantName && tenant != null) {
            String name = firstNonBlank(tenant.getFullNameAr(), tenant.getFullNameEn(), tenant.getFullName());
            if (name != null) {
                vars.put("tenantName", name);
            }
        }
        return vars;
    }

    private Map<String, Object> buildDraftPendingTenantVars(LeaseContract contract, Tenant tenant) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        Long unitId = contract.getUnitId() != null ? contract.getUnitId()
                : (tenant != null ? tenant.getUnitId() : null);
        if (unitId != null) {
            unitRepository.findById(unitId)
                    .map(Unit::getUnitNumber)
                    .ifPresent(num -> vars.put("unitNumber", num));
        }
        if (!vars.containsKey("unitNumber")) {
            vars.put("unitNumber", "—");
        }
        Long propertyId = contract.getPropertyId() != null ? contract.getPropertyId()
                : (tenant != null ? resolvePropertyId(tenant) : null);
        if (propertyId != null) {
            propertyRepository.findById(propertyId).ifPresent(p -> {
                String label = BilingualNotificationText.composite(
                        p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName());
                vars.put("propertyName", label);
            });
        }
        if (!vars.containsKey("propertyName")) {
            vars.put("propertyName", "—");
        }
        return vars;
    }

    private Optional<RentPaymentSchedule> firstPendingSchedule(Long contractId) {
        if (contractId == null) {
            return Optional.empty();
        }
        return scheduleRepository.findByContractId(contractId).stream()
                .filter(s -> s.getStatus() == PaymentScheduleStatus.PENDING)
                .min(Comparator.comparing(RentPaymentSchedule::getDueDate));
    }

    /** Property-scoped accountants take precedence; global accountants (no propertyId) are also kept in the loop. */
    public List<Long> collectAccountantUserIds(Long propertyId) {
        Set<Long> ids = new LinkedHashSet<>();
        if (propertyId != null) {
            userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT)
                    .stream()
                    .map(User::getId)
                    .filter(java.util.Objects::nonNull)
                    .forEach(ids::add);
        }
        userRepository.findByRoleAndActiveTrue(UserRole.ACCOUNTANT).stream()
                .filter(u -> u.getPropertyId() == null) // include only globals to avoid noisy cross-property mail
                .map(User::getId)
                .filter(java.util.Objects::nonNull)
                .forEach(ids::add);
        return new ArrayList<>(ids);
    }

    private record LangPair(String ar, String en) {}

    private LangPair composeBasicsOnlyParts(Tenant tenant) {
        StringBuilder ar = new StringBuilder();
        StringBuilder en = new StringBuilder();
        appendUnitAndProperty(ar, en, tenant);
        ar.append(appMessages.get(AppMessages.LOCALE_AR, "tenant.portal.body.portal_active"));
        en.append(appMessages.get(AppMessages.LOCALE_EN, "tenant.portal.body.portal_active"));
        return new LangPair(ar.toString(), en.toString());
    }

    private LangPair composeBodyParts(Tenant tenant, LeaseContract contract) {
        StringBuilder ar = new StringBuilder();
        StringBuilder en = new StringBuilder();
        appendUnitAndProperty(ar, en, tenant);
        ar.append(appMessages.get(AppMessages.LOCALE_AR, "tenant.portal.body.lease_line",
                contract.getContractNumber(), contractStatus(contract.getStatus(), AppMessages.LOCALE_AR)));
        en.append(appMessages.get(AppMessages.LOCALE_EN, "tenant.portal.body.lease_line",
                contract.getContractNumber(), contractStatus(contract.getStatus(), AppMessages.LOCALE_EN)));
        appendFirstPaymentLine(ar, en, contract.getId());
        return new LangPair(ar.toString(), en.toString());
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private void appendUnitAndProperty(StringBuilder ar, StringBuilder en, Tenant tenant) {
        if (tenant.getUnitId() != null) {
            unitRepository.findById(tenant.getUnitId()).ifPresent(u -> {
                String num = safe(u.getUnitNumber());
                ar.append(appMessages.get(AppMessages.LOCALE_AR, "tenant.portal.body.unit_assigned", num));
                en.append(appMessages.get(AppMessages.LOCALE_EN, "tenant.portal.body.unit_assigned", num));
            });
        }
        Long pid = resolvePropertyId(tenant);
        if (pid != null) {
            propertyRepository.findById(pid).ifPresent(p -> {
                String label = BilingualNotificationText.composite(
                        p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName());
                ar.append(appMessages.get(AppMessages.LOCALE_AR, "tenant.portal.body.property", label));
                en.append(appMessages.get(AppMessages.LOCALE_EN, "tenant.portal.body.property", label));
            });
        }
    }

    private void appendFirstPaymentLine(StringBuilder ar, StringBuilder en, Long contractId) {
        List<RentPaymentSchedule> rows = scheduleRepository.findByContractId(contractId);
        Optional<RentPaymentSchedule> firstPending = rows.stream()
                .filter(s -> s.getStatus() == PaymentScheduleStatus.PENDING)
                .min(Comparator.comparing(RentPaymentSchedule::getDueDate));
        if (firstPending.isPresent()) {
            RentPaymentSchedule s = firstPending.get();
            ar.append(appMessages.get(AppMessages.LOCALE_AR, "tenant.portal.body.first_payment",
                    s.getDueDate(), s.getAmount()));
            en.append(appMessages.get(AppMessages.LOCALE_EN, "tenant.portal.body.first_payment",
                    s.getDueDate(), s.getAmount()));
            return;
        }
        rows.stream().min(Comparator.comparing(RentPaymentSchedule::getDueDate))
                .ifPresent(s -> {
                    ar.append(appMessages.get(AppMessages.LOCALE_AR, "tenant.portal.body.next_schedule",
                            s.getDueDate(), s.getAmount(), scheduleStatus(s.getStatus(), AppMessages.LOCALE_AR)));
                    en.append(appMessages.get(AppMessages.LOCALE_EN, "tenant.portal.body.next_schedule",
                            s.getDueDate(), s.getAmount(), scheduleStatus(s.getStatus(), AppMessages.LOCALE_EN)));
                });
    }

    private Long resolvePropertyId(Tenant tenant) {
        if (tenant.getPropertyId() != null) {
            return tenant.getPropertyId();
        }
        if (tenant.getUnitId() == null) {
            return null;
        }
        return unitRepository.findById(tenant.getUnitId()).map(Unit::getPropertyId).orElse(null);
    }

    private static String safe(String s) {
        return s == null || s.isBlank() ? "—" : s.trim();
    }

    private String contractStatus(ContractStatus s, Locale locale) {
        if (s == null) {
            return "—";
        }
        return appMessages.get(locale, "contract.status." + s.name());
    }

    private String scheduleStatus(PaymentScheduleStatus s, Locale locale) {
        if (s == null) {
            return "—";
        }
        return appMessages.get(locale, "schedule.status." + s.name());
    }
}
