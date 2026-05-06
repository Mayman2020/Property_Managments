package com.propertymanagement.modules.tenantportal;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContract;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.payment.RentPaymentService;
import com.propertymanagement.modules.contract.payment.dto.UploadPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.tenantportal.dto.*;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

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

        return toActionResponse(actionRequestRepository.save(request));
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
