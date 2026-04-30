package com.propertymanagement.modules.tenantportal;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContract;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.tenantportal.dto.*;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantPortalService {

    private final TenantRepository tenantRepository;
    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final RentReceiptRepository receiptRepository;
    private final ContractActionRequestRepository actionRequestRepository;

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
                .status("PENDING")
                .build();

        return toReceiptResponse(receiptRepository.save(receipt));
    }

    public List<ActionRequestResponse> getActionRequests(Long tenantId) {
        return actionRequestRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toActionResponse).toList();
    }

    @Transactional
    public ActionRequestResponse createActionRequest(Long tenantId, ContractActionRequestDto req) {
        ContractActionRequest request = ContractActionRequest.builder()
                .tenantId(tenantId)
                .contractId(req.getContractId())
                .actionType(req.getActionType())
                .requestedDate(req.getRequestedDate())
                .reason(req.getReason())
                .notes(req.getNotes())
                .attachmentUrl(req.getAttachmentUrl())
                .status("PENDING")
                .build();

        return toActionResponse(actionRequestRepository.save(request));
    }

    // Admin: list all pending action requests
    public List<ActionRequestResponse> getPendingActionRequests() {
        return actionRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING")
                .stream().map(this::toActionResponse).toList();
    }

    @Transactional
    public ActionRequestResponse reviewActionRequest(Long requestId, String status, String adminNotes, Long reviewerUserId) {
        ContractActionRequest request = actionRequestRepository.findById(requestId)
                .orElseThrow(() -> AppException.notFound("Request not found: " + requestId));
        request.setStatus(status);
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
        receipt.setStatus(status);
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
}
