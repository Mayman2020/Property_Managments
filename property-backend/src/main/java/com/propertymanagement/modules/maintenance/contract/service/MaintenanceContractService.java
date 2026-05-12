package com.propertymanagement.modules.maintenance.contract.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.PropertyMaintenanceAssignmentRepository;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractDecisionRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractRenewalRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractResponse;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractTerminateRequest;
import com.propertymanagement.modules.maintenance.contractinvoice.repository.MaintenanceContractInvoiceRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import com.propertymanagement.modules.owner.entity.Owner;

@Service
@RequiredArgsConstructor
public class MaintenanceContractService {

    private static final DateTimeFormatter STAFF_LOG_TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final MaintenanceContractRepository contractRepo;
    private final PropertyMaintenanceAssignmentRepository assignmentRepo;
    private final ContractorCompanyRepository companyRepo;
    private final MaintenanceContractInvoiceRepository invoiceRepo;
    private final PropertyRepository propertyRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService ownerRecipientService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    // ── List all contracts (global, admin view) ──────────────────────────
    public List<MaintenanceContractResponse> listAll() {
        return contractRepo.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<MaintenanceContractResponse> listByStatus(String status) {
        return contractRepo.findByStatusOrderByCreatedAtDesc(status)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<MaintenanceContractResponse> listOwnerScopedByStatus(String status) {
        var scope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (scope == null) {
            return listByStatus(status);
        }
        if (scope.isEmpty()) {
            return List.of();
        }
        return contractRepo.findByStatusAndPropertyIdInOrderByCreatedAtDesc(status, scope)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── List contracts for a property ────────────────────────────────────
    public List<MaintenanceContractResponse> listByProperty(Long propertyId) {
        return contractRepo.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── List contracts for a company ────────────────────────────────────
    public List<MaintenanceContractResponse> listByCompany(Long companyId) {
        return contractRepo.findByContractorCompanyIdOrderByCreatedAtDesc(companyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Get single contract ───────────────────────────────────────────────
    public MaintenanceContractResponse getById(Long id) {
        return toResponse(requireContract(id));
    }

    // ── Create contract (standalone – no assignment workflow) ─────────────
    @Transactional
    public MaintenanceContractResponse createStandalone(
            com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractCreateRequest request) {
        Long propertyId = request.getPropertyId();
        Long companyId = request.getContractorCompanyId();

        // Validate property exists
        propertyRepo.findById(propertyId)
                .filter(Property::isActive)
                .orElseThrow(() -> AppException.notFound("Property not found: " + propertyId));

        // Validate company exists & is active
        companyRepo.findById(companyId)
                .filter(com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity::isActive)
                .orElseThrow(() -> AppException.notFound("Active company not found: " + companyId));

        // Prevent duplicate active contract for same company on the same property (date window)
        if (contractRepo.existsActiveOngoingForContractorOnProperty(companyId, propertyId, LocalDate.now())) {
            throw AppException.conflict("This company already has an active maintenance contract on this property");
        }

        if (request.getStartDate() == null) {
            throw AppException.badRequest("Contract start date is required");
        }
        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw AppException.badRequest("Contract end date must be after or equal to start date");
        }

        String contractNumber = generateContractNumber();
        Long actorUserId = currentActorUserId();

        MaintenanceContract contract = contractRepo.save(MaintenanceContract.builder()
                .propertyId(propertyId)
                .contractorCompanyId(companyId)
                .contractNumber(contractNumber)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .contractValue(request.getContractValue())
                .notes(request.getNotes())
                .status("DRAFT")
                .ownerApprovalStatus("PENDING")
                .build());

        appendStaffLog(contract, actorUserId, "CREATED", "standalone contract");
        contractRepo.save(contract);
        notifyDraftCreated(contract, actorUserId);
        return toResponse(contract);
    }

    // ── Activate contract ─────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractResponse activate(Long id) {
        return approveDraft(id, currentActorUserId(), null);
    }

    @Transactional
    public MaintenanceContractResponse approveDraft(Long id, Long actorUserId, String notes) {
        MaintenanceContract contract = requireContract(id);
        if ("ACTIVE".equals(contract.getStatus())) {
            throw AppException.badRequest("Contract is already active");
        }
        if (!"DRAFT".equals(contract.getStatus()) && !"PENDING_OWNER_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Only draft maintenance contracts can be approved");
        }
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        contract.setStatus("ACTIVE");
        contract.setOwnerApprovalStatus("APPROVED");
        contract.setOwnerApprovalNotes(notes);
        contract.setOwnerApprovedBy(actorUserId);
        contract.setOwnerApprovedAt(LocalDateTime.now());
        appendStaffLog(contract, actorUserId, "APPROVED", safeNotes(notes));
        contractRepo.save(contract);
        activateLinkedAssignment(contract);
        notifyLifecycle(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_APPROVED,
                "Maintenance contract approved",
                "Maintenance contract " + contract.getContractNumber() + " was approved.");
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse rejectDraft(Long id, Long actorUserId, String notes) {
        MaintenanceContract contract = requireContract(id);
        if (!"DRAFT".equals(contract.getStatus()) && !"PENDING_OWNER_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Only draft maintenance contracts can be rejected");
        }
        if (notes == null || notes.isBlank()) {
            throw AppException.badRequest("Rejection reason is required");
        }
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        contract.setStatus("CANCELLED");
        contract.setOwnerApprovalStatus("REJECTED");
        contract.setOwnerApprovalNotes(notes.trim());
        contract.setOwnerApprovedBy(actorUserId);
        contract.setOwnerApprovedAt(LocalDateTime.now());
        appendStaffLog(contract, actorUserId, "REJECTED", notes.trim());
        contractRepo.save(contract);
        closeLinkedAssignment(contract, "CANCELLED");
        notifyLifecycle(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_REJECTED,
                "Maintenance contract rejected",
                "Maintenance contract " + contract.getContractNumber() + " was rejected. " + notes.trim());
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse cancelDraft(Long id, String reason) {
        MaintenanceContract contract = requireContract(id);
        if (!"DRAFT".equals(contract.getStatus()) && !"PENDING_OWNER_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Only draft maintenance contracts can be cancelled");
        }
        Long actorUserId = currentActorUserId();
        contract.setStatus("CANCELLED");
        appendStaffLog(contract, actorUserId, "CANCELLED", safeNotes(reason));
        contractRepo.save(contract);
        closeLinkedAssignment(contract, "CANCELLED");
        notifyLifecycle(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_REJECTED,
                "Maintenance contract cancelled",
                "Maintenance contract " + contract.getContractNumber() + " was cancelled.");
        return toResponse(contract);
    }

    // ── Terminate contract ────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractResponse terminate(Long id) {
        MaintenanceContractTerminateRequest request = new MaintenanceContractTerminateRequest();
        request.setTerminationDate(LocalDate.now());
        request.setReason("Direct termination");
        return requestTermination(id, request);
    }

    @Transactional
    public MaintenanceContractResponse requestTermination(Long id, MaintenanceContractTerminateRequest request) {
        MaintenanceContract contract = requireContract(id);
        if (!"ACTIVE".equals(contract.getStatus())) {
            throw AppException.badRequest("Only active contracts can be terminated");
        }
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        Long actorUserId = currentActorUserId();
        contract.setStatus("PENDING_TERMINATION_APPROVAL");
        contract.setTerminationRequestedBy(actorUserId);
        contract.setTerminationRequestedAt(LocalDateTime.now());
        contract.setTerminationProposedDate(request.getTerminationDate());
        contract.setTerminationRequestNotes(request.getReason());
        appendStaffLog(contract, actorUserId, "TERMINATION_REQUESTED",
                request.getTerminationDate() + " | " + safeNotes(request.getReason()));
        contractRepo.save(contract);
        notifyOwners(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_TERMINATION_REQUESTED,
                "Maintenance contract termination requested",
                "Please review termination request for maintenance contract " + contract.getContractNumber() + ".");
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse cancelTerminationRequest(Long id) {
        MaintenanceContract contract = requireContract(id);
        if (!"PENDING_TERMINATION_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Contract is not awaiting termination approval");
        }
        Long actorUserId = currentActorUserId();
        clearTerminationRequest(contract);
        contract.setStatus("ACTIVE");
        appendStaffLog(contract, actorUserId, "TERMINATION_REQUEST_CANCELLED", "withdrawn by staff");
        contractRepo.save(contract);
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse decideTermination(Long id, MaintenanceContractDecisionRequest request, Long actorUserId) {
        MaintenanceContract contract = contractRepo.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("Maintenance contract not found with id " + id));
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        if (!"PENDING_TERMINATION_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Contract is not awaiting termination approval");
        }
        boolean approved = "APPROVED".equalsIgnoreCase(request.getDecision());
        contract.setTerminationDecisionBy(actorUserId);
        contract.setTerminationDecisionAt(LocalDateTime.now());
        contract.setTerminationDecisionNotes(request.getNotes());
        if (approved) {
            contract.setStatus("ENDED");
            LocalDate effective = contract.getTerminationProposedDate() != null
                    ? contract.getTerminationProposedDate() : LocalDate.now();
            if (contract.getEndDate() == null || contract.getEndDate().isAfter(effective)) {
                contract.setEndDate(effective);
            }
            appendStaffLog(contract, actorUserId, "TERMINATION_APPROVED", safeNotes(request.getNotes()));
        } else {
            clearTerminationRequest(contract);
            contract.setStatus("ACTIVE");
            appendStaffLog(contract, actorUserId, "TERMINATION_REJECTED", safeNotes(request.getNotes()));
        }
        contractRepo.save(contract);
        notifyLifecycle(contract, actorUserId,
                approved ? NotificationType.MAINTENANCE_CONTRACT_TERMINATION_APPROVED : NotificationType.MAINTENANCE_CONTRACT_TERMINATION_REJECTED,
                approved ? "Maintenance contract termination approved" : "Maintenance contract termination rejected",
                "Maintenance contract " + contract.getContractNumber() + " termination decision was recorded.");
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse requestRenewal(Long id, MaintenanceContractRenewalRequest request) {
        MaintenanceContract contract = requireContract(id);
        if (!"ACTIVE".equals(contract.getStatus())) {
            throw AppException.badRequest("Only active maintenance contracts can be renewed");
        }
        if (!request.getProposedEndDate().isAfter(request.getProposedStartDate())) {
            throw AppException.badRequest("Renewal end date must be after start date");
        }
        Long actorUserId = currentActorUserId();
        contract.setStatus("PENDING_RENEWAL_APPROVAL");
        contract.setRenewalRequestedBy(actorUserId);
        contract.setRenewalRequestedAt(LocalDateTime.now());
        contract.setRenewalRequestedNote(request.getNote());
        contract.setRenewalProposedStartDate(request.getProposedStartDate());
        contract.setRenewalProposedEndDate(request.getProposedEndDate());
        contract.setRenewalProposedValue(request.getProposedValue());
        contract.setRenewalDecisionBy(null);
        contract.setRenewalDecisionAt(null);
        contract.setRenewalDecisionNote(null);
        contract.setRenewalDecisionStatus(null);
        appendStaffLog(contract, actorUserId, "RENEWAL_REQUESTED",
                request.getProposedStartDate() + "->" + request.getProposedEndDate());
        contractRepo.save(contract);
        notifyOwners(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_RENEWAL_REQUESTED,
                "Maintenance contract renewal requested",
                "Please review renewal request for maintenance contract " + contract.getContractNumber() + ".");
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse cancelRenewalRequest(Long id) {
        MaintenanceContract contract = requireContract(id);
        if (!"PENDING_RENEWAL_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Contract is not awaiting renewal approval");
        }
        Long actorUserId = currentActorUserId();
        clearRenewalRequest(contract, true);
        contract.setStatus("ACTIVE");
        appendStaffLog(contract, actorUserId, "RENEWAL_REQUEST_CANCELLED", "withdrawn by staff");
        contractRepo.save(contract);
        return toResponse(contract);
    }

    @Transactional
    public MaintenanceContractResponse decideRenewal(Long id, MaintenanceContractDecisionRequest request, Long actorUserId) {
        MaintenanceContract contract = contractRepo.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("Maintenance contract not found with id " + id));
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        if (!"PENDING_RENEWAL_APPROVAL".equals(contract.getStatus())) {
            throw AppException.badRequest("Contract is not awaiting renewal approval");
        }
        boolean approved = "APPROVED".equalsIgnoreCase(request.getDecision());
        contract.setRenewalDecisionBy(actorUserId);
        contract.setRenewalDecisionAt(LocalDateTime.now());
        contract.setRenewalDecisionNote(request.getNotes());
        contract.setRenewalDecisionStatus(approved ? "APPROVED" : "REJECTED");
        if (approved) {
            MaintenanceContract renewed = MaintenanceContract.builder()
                    .propertyId(contract.getPropertyId())
                    .contractorCompanyId(contract.getContractorCompanyId())
                    .assignmentId(contract.getAssignmentId())
                    .contractNumber(generateContractNumber())
                    .startDate(contract.getRenewalProposedStartDate())
                    .endDate(contract.getRenewalProposedEndDate())
                    .slaHours(contract.getSlaHours())
                    .contractValue(contract.getRenewalProposedValue() != null ? contract.getRenewalProposedValue() : contract.getContractValue())
                    .notes(contract.getRenewalRequestedNote())
                    .status("ACTIVE")
                    .previousContractId(contract.getId())
                    .ownerApprovalStatus("APPROVED")
                    .ownerApprovalNotes(request.getNotes())
                    .ownerApprovedBy(actorUserId)
                    .ownerApprovedAt(LocalDateTime.now())
                    .build();
            MaintenanceContract savedRenewed = contractRepo.save(renewed);
            contract.setStatus("RENEWED");
            appendStaffLog(contract, actorUserId, "RENEWAL_APPROVED", safeNotes(request.getNotes()));
            contractRepo.save(contract);
            notifyLifecycle(savedRenewed, actorUserId, NotificationType.MAINTENANCE_CONTRACT_RENEWAL_APPROVED,
                    "Maintenance contract renewal approved",
                    "Maintenance contract " + contract.getContractNumber() + " renewal was approved.");
            return toResponse(savedRenewed);
        }
        clearRenewalRequest(contract, false);
        contract.setStatus("ACTIVE");
        appendStaffLog(contract, actorUserId, "RENEWAL_REJECTED", safeNotes(request.getNotes()));
        contractRepo.save(contract);
        notifyLifecycle(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_RENEWAL_REJECTED,
                "Maintenance contract renewal rejected",
                "Maintenance contract " + contract.getContractNumber() + " renewal was rejected.");
        return toResponse(contract);
    }

    // ── Helper ────────────────────────────────────────────────────────────
    private MaintenanceContract requireContract(Long id) {
        return contractRepo.findById(id)
                .orElseThrow(() -> AppException.notFound("Maintenance contract not found with id " + id));
    }

    public void notifyDraftCreated(MaintenanceContract contract, Long actorUserId) {
        // Owners get the action-oriented "awaiting your approval" notification.
        List<Long> owners = ownerRecipientService.portalRecipientUserIds(contract.getPropertyId());
        if (!owners.isEmpty()) {
            notificationService.createForRecipients(
                    owners,
                    actorUserId,
                    contract.getPropertyId(),
                    null,
                    NotificationType.MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW,
                    "Maintenance contract awaiting approval",
                    "Maintenance contract " + contract.getContractNumber() + " is awaiting owner approval.",
                    notificationParams(contract, NotificationType.MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW));
        }
        // Internal/contractor audience gets the same semantic notification, but without
        // re-notifying any owner who is already part of the owner-portal recipient set
        // (otherwise the SAME user receives two visually identical rows).
        notifyLifecycleExcluding(contract, actorUserId, NotificationType.MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW,
                "Maintenance contract created",
                "Maintenance contract " + contract.getContractNumber() + " was created as draft.",
                owners);
    }

    MaintenanceContractResponse toResponse(MaintenanceContract c) {
        String companyName = null, companyNameAr = null, companyNameEn = null;
        ContractorCompanyEntity company = companyRepo.findById(c.getContractorCompanyId()).orElse(null);
        if (company != null) {
            companyName  = company.getName();
            companyNameAr = company.getNameAr();
            companyNameEn = company.getNameEn();
        }
        int invoiceCount = (int) invoiceRepo.countByContractId(c.getId());
        return new MaintenanceContractResponse(
                c.getId(), c.getPropertyId(), c.getContractorCompanyId(),
                companyName, companyNameAr, companyNameEn,
                c.getAssignmentId(), c.getContractNumber(),
                c.getStartDate(), c.getEndDate(),
                c.getSlaHours(), c.getContractValue(),
                c.getStatus(), c.getNotes(), c.getCreatedAt(),
                invoiceCount,
                c.getPreviousContractId(),
                c.getOwnerApprovalStatus(), c.getOwnerApprovalNotes(),
                c.getTerminationProposedDate(), c.getTerminationRequestNotes(),
                c.getRenewalProposedStartDate(), c.getRenewalProposedEndDate(),
                c.getRenewalProposedValue(), c.getRenewalRequestedNote(),
                c.getRenewalDecisionStatus()
        );
    }

    public String generateContractNumber() {
        int year = LocalDate.now().getYear();
        String prefix = String.format("MC-%d-", year);
        long seq = contractRepo.countByContractNumberStartingWith(prefix) + 1;
        String candidate = String.format("%s%05d", prefix, seq);
        while (contractRepo.existsByContractNumber(candidate)) {
            seq++;
            candidate = String.format("%s%05d", prefix, seq);
        }
        return candidate;
    }

    private void notifyOwners(MaintenanceContract contract, Long actorUserId, NotificationType type, String title, String message) {
        List<Long> owners = ownerRecipientService.portalRecipientUserIds(contract.getPropertyId());
        if (owners.isEmpty()) return;
        notificationService.createForRecipients(owners, actorUserId, contract.getPropertyId(), null, type, title, message, notificationParams(contract, type));
    }

    private void notifyLifecycle(MaintenanceContract contract, Long actorUserId, NotificationType type, String title, String message) {
        notifyLifecycleExcluding(contract, actorUserId, type, title, message, java.util.Collections.emptyList());
    }

    /**
     * Same as {@link #notifyLifecycle} but skips the supplied recipient IDs. Used by
     * {@link #notifyDraftCreated} so an owner who already received the dedicated
     * "awaiting your approval" notification is not re-notified by the lifecycle fan-out.
     */
    private void notifyLifecycleExcluding(MaintenanceContract contract, Long actorUserId, NotificationType type,
                                          String title, String message, Collection<Long> excludeRecipients) {
        LinkedHashSet<Long> recipients = new LinkedHashSet<>();
        recipients.addAll(userRepo.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream().map(User::getId).toList());
        recipients.addAll(userRepo.findByRoleAndActiveTrue(UserRole.ACCOUNTANT).stream().map(User::getId).toList());
        recipients.addAll(userRepo.findByPropertyIdAndRoleAndActiveTrue(contract.getPropertyId(), UserRole.ACCOUNTANT).stream().map(User::getId).toList());
        recipients.addAll(userRepo.findActiveContractorStaffForProperty(contract.getPropertyId(), contract.getContractorCompanyId()).stream().map(User::getId).toList());
        recipients.addAll(ownerRecipientService.portalRecipientUserIds(contract.getPropertyId()));
        recipients.remove(null);
        if (excludeRecipients != null && !excludeRecipients.isEmpty()) {
            recipients.removeAll(excludeRecipients);
        }
        if (recipients.isEmpty()) return;
        notificationService.createForRecipients(new ArrayList<>(recipients), actorUserId, contract.getPropertyId(), null, type, title, message, notificationParams(contract, type));
    }

    private Map<String, Object> notificationParams(MaintenanceContract contract, NotificationType type) {
        Map<String, Object> params = new LinkedHashMap<>();
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("propertyName", contract.getPropertyId() != null
                ? propertyRepo.findById(contract.getPropertyId()).map(Property::getPropertyName).orElse("—")
                : "—");
        vars.put("companyName", companyRepo.findById(contract.getContractorCompanyId())
                .map(c -> {
                    if (c.getNameAr() != null && !c.getNameAr().isBlank()) return c.getNameAr();
                    if (c.getNameEn() != null && !c.getNameEn().isBlank()) return c.getNameEn();
                    return c.getName();
                }).orElse("—"));
        params.put("titleKey", notificationTitleKey(type));
        params.put("bodyKey", notificationBodyKey(type));
        params.put("vars", vars);
        params.put("maintenanceContractId", contract.getId());
        return params;
    }

    private String notificationTitleKey(NotificationType type) {
        return "NOTIFICATIONS.TYPES." + type.name() + ".TITLE";
    }

    private String notificationBodyKey(NotificationType type) {
        return "NOTIFICATIONS.TYPES." + type.name() + ".BODY";
    }

    private void activateLinkedAssignment(MaintenanceContract contract) {
        if (contract.getAssignmentId() == null) {
            return;
        }
        assignmentRepo.findById(contract.getAssignmentId()).ifPresent(assignment -> {
            if (assignment.isPrimary()) {
                assignmentRepo.findActivePrimaryByPropertyId(assignment.getPropertyId()).ifPresent(existing -> {
                    if (!existing.getId().equals(assignment.getId())) {
                        existing.setStatus("ENDED");
                        existing.setEndDate(LocalDate.now());
                        assignmentRepo.save(existing);
                    }
                });
            }
            assignment.setStatus("ACTIVE");
            assignmentRepo.save(assignment);
        });
    }

    private void closeLinkedAssignment(MaintenanceContract contract, String status) {
        if (contract.getAssignmentId() == null) {
            return;
        }
        assignmentRepo.findById(contract.getAssignmentId()).ifPresent(assignment -> {
            assignment.setStatus(status);
            assignment.setEndDate(LocalDate.now());
            assignmentRepo.save(assignment);
        });
    }

    private void appendStaffLog(MaintenanceContract contract, Long actorUserId, String action, String detail) {
        String actor = actorUserId != null ? ("#" + actorUserId) : "system";
        String safeDetail = safeNotes(detail).replace('\n', ' ').replace('\r', ' ');
        String line = LocalDateTime.now().format(STAFF_LOG_TS) + " | " + actor + " | " + action + " | " + safeDetail + "\n";
        contract.setStaffChangeLog((contract.getStaffChangeLog() != null ? contract.getStaffChangeLog() : "") + line);
    }

    private void clearTerminationRequest(MaintenanceContract contract) {
        contract.setTerminationRequestedBy(null);
        contract.setTerminationRequestedAt(null);
        contract.setTerminationRequestNotes(null);
        contract.setTerminationProposedDate(null);
    }

    private void clearRenewalRequest(MaintenanceContract contract, boolean clearDecisionMeta) {
        contract.setRenewalRequestedBy(null);
        contract.setRenewalRequestedAt(null);
        contract.setRenewalRequestedNote(null);
        contract.setRenewalProposedStartDate(null);
        contract.setRenewalProposedEndDate(null);
        contract.setRenewalProposedValue(null);
        if (clearDecisionMeta) {
            contract.setRenewalDecisionBy(null);
            contract.setRenewalDecisionAt(null);
            contract.setRenewalDecisionNote(null);
            contract.setRenewalDecisionStatus(null);
        }
    }

    private String safeNotes(String notes) {
        return notes == null || notes.isBlank() ? "(no notes)" : notes.trim();
    }

    private Long currentActorUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        return null;
    }
}
