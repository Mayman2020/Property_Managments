package com.propertymanagement.modules.tenantportal.service;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.dto.ContractRenewalRequestDto;
import com.propertymanagement.modules.contract.lease.dto.TerminateContractDto;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.payment.service.RentPaymentService;
import com.propertymanagement.modules.contract.payment.dto.UploadPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.service.TenantPortalWelcomeService;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.tenantportal.dto.*;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import com.propertymanagement.modules.tenantportal.entity.RentReceipt;
import com.propertymanagement.modules.tenantportal.entity.ContractActionRequest;
import com.propertymanagement.modules.tenantportal.repository.RentReceiptRepository;
import com.propertymanagement.modules.tenantportal.repository.ContractActionRequestRepository;

@Service
@RequiredArgsConstructor
public class TenantPortalService {
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final String ACTION_RENEWAL = "RENEWAL";
    private static final String ACTION_TERMINATION = "TERMINATION";

    private final TenantRepository tenantRepository;
    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final RentPaymentService rentPaymentService;
    private final RentReceiptRepository receiptRepository;
    private final ContractActionRequestRepository actionRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final TenantPortalWelcomeService tenantPortalWelcomeService;

    public Tenant getTenantByUserId(Long userId) {
        return tenantRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("Tenant profile not found for user: " + userId));
    }

    public ContractResponse getActiveContract(Long tenantId) {
        LeaseContract contract = contractRepository
                .findFirstByTenantIdAndStatusOrderByStartDateDesc(tenantId, ContractStatus.ACTIVE)
                .orElseThrow(() -> AppException.notFound("No active contract found"));
        return contractService.toResponse(contract);
    }

    public List<ContractResponse> getContractsForTenant(Long tenantId) {
        return contractRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(contractService::toResponse)
                .toList();
    }

    public ContractResponse getContractForTenantUser(Long userId, Long contractId) {
        Tenant tenant = getTenantByUserId(userId);
        LeaseContract c = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + contractId));
        if (!Objects.equals(c.getTenantId(), tenant.getId())) {
            throw AppException.forbidden("Not your contract");
        }
        return contractService.toResponse(c);
    }

    public List<ScheduleItemResponse> getPaymentScheduleForTenantUser(Long userId, Long contractId) {
        getContractForTenantUser(userId, contractId);
        return rentPaymentService.getSchedule(contractId);
    }

    public Page<ScheduleItemResponse> getPaymentScheduleForTenantUser(Long userId, Long contractId, Pageable pageable) {
        getContractForTenantUser(userId, contractId);
        return rentPaymentService.getSchedule(contractId, pageable);
    }

    @Transactional
    public ScheduleItemResponse uploadPaymentProof(Long userId, Long contractId, Long scheduleId, UploadPaymentProofRequest req) {
        ContractResponse contract = getContractForTenantUser(userId, contractId);
        ScheduleItemResponse row = rentPaymentService.uploadProof(scheduleId, userId, req);
        if (!Objects.equals(row.getContractId(), contract.getId())) {
            throw AppException.forbidden("Payment schedule item is not part of your contract");
        }
        return row;
    }

    public List<ReceiptResponse> getReceipts(Long tenantId) {
        return receiptRepository.findByTenantIdOrderByPeriodYearDescPeriodMonthDesc(tenantId)
                .stream().map(this::toReceiptResponse).toList();
    }

    @Transactional
    public ReceiptResponse uploadReceipt(Long tenantId, UploadReceiptRequest req) {
        receiptRepository.findByTenantIdAndPeriodYearAndPeriodMonth(tenantId, req.getPeriodYear(), req.getPeriodMonth())
                .ifPresent(r -> { throw AppException.conflict("Receipt already uploaded for this period"); });

        Long contractId = contractRepository
                .findFirstByTenantIdAndStatusOrderByStartDateDesc(tenantId, ContractStatus.ACTIVE)
                .map(LeaseContract::getId)
                .orElse(null);

        RentReceipt receipt = RentReceipt.builder()
                .tenantId(tenantId)
                .contractId(contractId)
                .periodMonth(req.getPeriodMonth())
                .periodYear(req.getPeriodYear())
                .amount(req.getAmount())
                .fileUrl(req.getFileUrl())
                .notes(req.getNotes())
                .status(STATUS_PENDING)
                .uploadSource("TENANT")
                .build();

        return toReceiptResponse(receiptRepository.save(receipt));
    }

    @Transactional
    public ReceiptResponse uploadReceiptAsStaff(Long staffUserId, StaffUploadReceiptRequest req) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> AppException.forbidden("User not found"));
        Long tenantId = req.getTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant not found: " + tenantId));
        receiptRepository.findByTenantIdAndPeriodYearAndPeriodMonth(tenantId, req.getPeriodYear(), req.getPeriodMonth())
                .ifPresent(r -> {
                    throw AppException.conflict("Receipt already exists for this tenant and period");
                });

        LeaseContract contractRef = null;
        if (req.getContractId() != null) {
            contractRef = contractRepository.findById(req.getContractId())
                    .orElseThrow(() -> AppException.notFound("Lease contract not found: " + req.getContractId()));
            if (!Objects.equals(contractRef.getTenantId(), tenantId)) {
                throw AppException.badRequest("Contract does not belong to this tenant");
            }
        } else {
            contractRef = contractRepository
                    .findFirstByTenantIdAndStatusOrderByStartDateDesc(tenantId, ContractStatus.ACTIVE)
                    .orElse(null);
        }
        assertStaffMayUploadForTenant(staff, tenant, contractRef);

        Long contractId = req.getContractId() != null ? req.getContractId()
                : (contractRef != null ? contractRef.getId() : null);

        RentReceipt receipt = RentReceipt.builder()
                .tenantId(tenantId)
                .contractId(contractId)
                .periodMonth(req.getPeriodMonth())
                .periodYear(req.getPeriodYear())
                .amount(req.getAmount())
                .fileUrl(req.getFileUrl())
                .notes(req.getNotes())
                .status("APPROVED")
                .uploadSource("STAFF")
                .reviewedBy(staffUserId)
                .reviewedAt(LocalDateTime.now())
                .build();

        return toReceiptResponse(receiptRepository.save(receipt));
    }

    private void assertStaffMayUploadForTenant(User staff, Tenant tenant, LeaseContract contractOrNull) {
        if (staff.getRole() == UserRole.SUPER_ADMIN || staff.getRole() == UserRole.GENERAL_MANAGER) {
            return;
        }
        Long scopePid = staff.getPropertyId();
        if (scopePid == null) {
            return;
        }
        if (tenant.getPropertyId() != null && tenant.getPropertyId().equals(scopePid)) {
            return;
        }
        if (contractOrNull != null && contractOrNull.getPropertyId() != null
                && contractOrNull.getPropertyId().equals(scopePid)) {
            return;
        }
        throw AppException.forbidden("Tenant or contract is outside your property scope");
    }

    public List<ActionRequestResponse> getActionRequests(Long tenantId) {
        return actionRequestRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toActionResponse).toList();
    }

    @Transactional
    public ActionRequestResponse createActionRequest(Long tenantId, ContractActionRequestDto req) {
        String actionType = normalizeActionType(req.getActionType());
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> AppException.notFound("Tenant not found: " + tenantId));
        LeaseContract contract = contractRepository.findById(req.getContractId())
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + req.getContractId()));
        if (!Objects.equals(contract.getTenantId(), tenantId)) {
            throw AppException.forbidden("Not your contract");
        }
        ContractActionRequest request = ContractActionRequest.builder()
                .tenantId(tenantId)
                .contractId(req.getContractId())
                .actionType(actionType)
                .requestedDate(req.getRequestedDate())
                .reason(req.getReason())
                .notes(req.getNotes())
                .attachmentUrl(req.getAttachmentUrl())
                .status(STATUS_PENDING)
                .build();

        ContractActionRequest saved = actionRequestRepository.save(request);
        submitTenantActionForOwnerApproval(saved, contract, tenant);
        return toActionResponse(saved);
    }

    // Admin: list all pending action requests
    public List<ActionRequestResponse> getPendingActionRequests() {
        return actionRequestRepository.findByStatusOrderByCreatedAtDesc(STATUS_PENDING)
                .stream().map(this::toActionResponse).toList();
    }

    @Transactional
    public ActionRequestResponse reviewActionRequest(Long requestId, String status, String adminNotes, Long reviewerUserId) {
        ContractActionRequest request = actionRequestRepository.findById(requestId)
                .orElseThrow(() -> AppException.notFound("Request not found: " + requestId));
        if (!STATUS_PENDING.equalsIgnoreCase(request.getStatus())) {
            throw AppException.badRequest("Only pending requests can be reviewed");
        }
        request.setStatus(normalizeReviewStatus(status));
        request.setAdminNotes(adminNotes);
        request.setReviewedBy(reviewerUserId);
        request.setReviewedAt(java.time.LocalDateTime.now());
        return toActionResponse(actionRequestRepository.save(request));
    }

    // Admin: list all receipts for a contract
    public List<ReceiptResponse> getReceiptsByContract(Long contractId) {
        return receiptRepository.findByContractIdOrderByPeriodYearDescPeriodMonthDesc(contractId)
                .stream().map(this::toReceiptResponse).toList();
    }

    @Transactional
    public ReceiptResponse reviewReceipt(Long receiptId, String status, Long reviewerUserId) {
        RentReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> AppException.notFound("Receipt not found: " + receiptId));
        if (!STATUS_PENDING.equalsIgnoreCase(receipt.getStatus())) {
            throw AppException.badRequest("Only pending receipts can be reviewed");
        }
        receipt.setStatus(normalizeReviewStatus(status));
        receipt.setReviewedBy(reviewerUserId);
        receipt.setReviewedAt(java.time.LocalDateTime.now());
        return toReceiptResponse(receiptRepository.save(receipt));
    }

    public ReceiptResponse toReceiptResponsePublic(RentReceipt r) {
        return toReceiptResponse(r);
    }

    private void notifyApprovalAudienceOfTenantActionRequest(ContractActionRequest request, LeaseContract contract) {
        if (request == null || contract == null) {
            return;
        }
        try {
            Set<Long> recipients = new LinkedHashSet<>();
            if (contract.getPropertyId() != null) {
                recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId()));
            }
            recipients.addAll(collectAdminApprovalUserIds());
            recipients.addAll(tenantPortalWelcomeService.collectAccountantUserIds(contract.getPropertyId()));
            recipients.remove(null);
            if (recipients.isEmpty()) {
                return;
            }

            ContractResponse summary = contractService.toResponse(contract);
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
            vars.put("tenantName", resolveTenantName(request.getTenantId()));
            vars.put("unitNumber", Objects.toString(summary.getUnitNumber(), "—"));
            vars.put("propertyName", Objects.toString(summary.getPropertyName(), "—"));
            vars.put("requestNote", request.getNotes() != null && !request.getNotes().isBlank() ? request.getNotes() : "—");

            NotificationType type;
            String titleKey;
            String bodyKey;
            if (ACTION_TERMINATION.equals(request.getActionType())) {
                vars.put("terminationDate", request.getRequestedDate() != null ? request.getRequestedDate().toString() : "—");
                vars.put("terminationReason", request.getReason() != null && !request.getReason().isBlank() ? request.getReason() : "—");
                type = NotificationType.CONTRACT_TERMINATION_REQUESTED;
                titleKey = "NOTIFICATIONS.CONTRACT_TERMINATION_REQUESTED_TITLE";
                bodyKey = "NOTIFICATIONS.CONTRACT_TERMINATION_REQUESTED_BODY";
            } else {
                vars.put("proposedStartDate", request.getRequestedDate() != null ? request.getRequestedDate().toString() : "—");
                vars.put("proposedEndDate", "—");
                vars.put("proposedRentAmount", contract.getMonthlyRent() != null ? contract.getMonthlyRent().toPlainString() : "—");
                type = NotificationType.CONTRACT_RENEWAL_REQUESTED;
                titleKey = "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REQUESTED.TITLE";
                bodyKey = "NOTIFICATIONS.TYPES.CONTRACT_RENEWAL_REQUESTED.BODY";
            }

            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("contractId", contract.getId());
            hints.put("contractActionRequestId", request.getId());
            notificationService.createLocalized(
                    recipients.stream().toList(),
                    null,
                    contract.getPropertyId(),
                    null,
                    type,
                    titleKey,
                    bodyKey,
                    vars,
                    hints);
        } catch (Exception ignored) {
            // Notification side-effect must not block tenant request persistence.
        }
    }

    private void submitTenantActionForOwnerApproval(ContractActionRequest request, LeaseContract contract, Tenant tenant) {
        Long requesterUserId = tenant != null ? tenant.getUserId() : null;
        if (ACTION_RENEWAL.equals(request.getActionType())) {
            contractService.requestRenewal(contract.getId(), buildTenantRenewalRequest(request, contract), requesterUserId);
            return;
        }
        if (ACTION_TERMINATION.equals(request.getActionType())) {
            contractService.terminate(contract.getId(), buildTenantTerminationRequest(request), requesterUserId);
            return;
        }
        notifyApprovalAudienceOfTenantActionRequest(request, contract);
    }

    private ContractRenewalRequestDto buildTenantRenewalRequest(ContractActionRequest request, LeaseContract contract) {
        LocalDate minStart = contract.getEndDate() != null ? contract.getEndDate() : LocalDate.now();
        LocalDate requestedStart = request.getRequestedDate() != null ? request.getRequestedDate() : minStart;
        LocalDate proposedStart = requestedStart.isBefore(minStart) ? minStart : requestedStart;
        long currentDurationDays = 365;
        if (contract.getStartDate() != null && contract.getEndDate() != null && contract.getEndDate().isAfter(contract.getStartDate())) {
            currentDurationDays = Math.max(1, ChronoUnit.DAYS.between(contract.getStartDate(), contract.getEndDate()));
        }

        ContractRenewalRequestDto dto = new ContractRenewalRequestDto();
        dto.setProposedStartDate(proposedStart);
        dto.setProposedEndDate(proposedStart.plusDays(currentDurationDays));
        dto.setProposedRentAmount(contract.getMonthlyRent());
        dto.setNote(firstNonBlank(request.getNotes(), request.getReason()));
        return dto;
    }

    private TerminateContractDto buildTenantTerminationRequest(ContractActionRequest request) {
        String reason = firstNonBlank(request.getReason(), request.getNotes(), "TENANT_REQUEST");
        TerminateContractDto dto = new TerminateContractDto();
        dto.setTerminationDate(request.getRequestedDate() != null ? request.getRequestedDate() : LocalDate.now());
        dto.setTerminationReason(reason);
        dto.setSecurityDepositReturnToTenant(Boolean.TRUE);
        dto.setHasDamages(Boolean.FALSE);
        dto.setDamagesPaidByTenant(Boolean.FALSE);
        return dto;
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

    private String resolveTenantName(Long tenantId) {
        if (tenantId == null) {
            return "—";
        }
        return tenantRepository.findById(tenantId)
                .map(t -> firstNonBlank(t.getFullNameAr(), t.getFullNameEn(), t.getFullName()))
                .filter(name -> !name.isBlank())
                .orElse("—");
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private ReceiptResponse toReceiptResponse(RentReceipt r) {
        return ReceiptResponse.builder()
                .id(r.getId())
                .tenantId(r.getTenantId())
                .contractId(r.getContractId())
                .periodMonth(r.getPeriodMonth())
                .periodYear(r.getPeriodYear())
                .amount(r.getAmount())
                .fileUrl(r.getFileUrl())
                .notes(r.getNotes())
                .status(r.getStatus())
                .uploadSource(r.getUploadSource())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private ActionRequestResponse toActionResponse(ContractActionRequest r) {
        return ActionRequestResponse.builder()
                .id(r.getId())
                .tenantId(r.getTenantId())
                .contractId(r.getContractId())
                .actionType(r.getActionType())
                .requestedDate(r.getRequestedDate())
                .reason(r.getReason())
                .notes(r.getNotes())
                .attachmentUrl(r.getAttachmentUrl())
                .status(r.getStatus())
                .adminNotes(r.getAdminNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private String normalizeReviewStatus(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!STATUS_APPROVED.equals(normalized) && !STATUS_REJECTED.equals(normalized)) {
            throw AppException.badRequest("Invalid review status. Expected APPROVED or REJECTED");
        }
        return normalized;
    }

    private String normalizeActionType(String actionType) {
        String normalized = actionType == null ? "" : actionType.trim().toUpperCase();
        if (!ACTION_RENEWAL.equals(normalized) && !ACTION_TERMINATION.equals(normalized)) {
            throw AppException.badRequest("Invalid action type. Expected RENEWAL or TERMINATION");
        }
        return normalized;
    }
}
