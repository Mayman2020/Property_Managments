package com.propertymanagement.modules.accountantportal.service;

import com.propertymanagement.modules.contract.lease.dto.ContractRenewalRequestDto;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.renewal.dto.RenewContractDto;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.tenantportal.dto.ActionRequestResponse;
import com.propertymanagement.modules.tenantportal.dto.ReceiptResponse;
import com.propertymanagement.modules.tenantportal.dto.ReceiptWithTenantDto;
import com.propertymanagement.modules.tenantportal.dto.RenewalRequestWithDetailsDto;
import com.propertymanagement.modules.tenantportal.entity.ContractActionRequest;
import com.propertymanagement.modules.tenantportal.entity.RentReceipt;
import com.propertymanagement.modules.tenantportal.repository.ContractActionRequestRepository;
import com.propertymanagement.modules.tenantportal.repository.RentReceiptRepository;
import com.propertymanagement.modules.tenantportal.service.TenantPortalService;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountantPortalService {
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final RentReceiptRepository receiptRepository;
    private final ContractActionRequestRepository actionRequestRepository;
    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final TenantRepository tenantRepository;
    private final AppMessages appMessages;
    private final TenantPortalService tenantPortalService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public List<ReceiptWithTenantDto> getReceiptsForPeriod(Integer year, Integer month) {
        List<RentReceipt> receipts = (month != null)
                ? receiptRepository.findByPeriodYearAndMonth(year, month)
                : receiptRepository.findByStatusOrderByPeriodYearDescPeriodMonthDesc(STATUS_PENDING);

        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            receipts = receipts.stream()
                    .filter(r -> contractRepository.findById(r.getContractId())
                            .map(c -> c.getPropertyId() != null && ownerScope.contains(c.getPropertyId()))
                            .orElse(false))
                    .toList();
        }

        Map<Long, Tenant> tenantMap = tenantRepository.findAllById(
                receipts.stream().map(RentReceipt::getTenantId).distinct().toList()
        ).stream().collect(Collectors.toMap(Tenant::getId, t -> t));

        return receipts.stream()
                .map(r -> toReceiptWithTenant(r, tenantMap.get(r.getTenantId())))
                .toList();
    }

    @Transactional
    public ReceiptResponse reviewReceipt(Long receiptId, String status, String notes, Long reviewerUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot review rent receipts");
        RentReceipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> AppException.notFound("Receipt not found: " + receiptId));
        String targetStatus = normalizeReviewStatus(status);
        if (!STATUS_PENDING.equalsIgnoreCase(receipt.getStatus())) {
            throw AppException.badRequest("Only pending receipts can be reviewed");
        }
        receipt.setStatus(targetStatus);
        receipt.setNotes(notes);
        receipt.setReviewedBy(reviewerUserId);
        receipt.setReviewedAt(LocalDateTime.now());
        return tenantPortalService.toReceiptResponsePublic(receiptRepository.save(receipt));
    }

    public List<RenewalRequestWithDetailsDto> getPendingRenewalRequests() {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        return actionRequestRepository.findByStatusOrderByCreatedAtDesc(STATUS_PENDING)
                .stream()
                .filter(r -> "RENEWAL".equals(r.getActionType()))
                .filter(r -> ownerScope == null || contractRepository.findById(r.getContractId())
                        .map(c -> c.getPropertyId() != null && ownerScope.contains(c.getPropertyId()))
                        .orElse(false))
                .map(this::toRenewalWithDetails)
                .toList();
    }

    @Transactional
    public ContractResponse processRenewal(Long requestId, RenewContractDto dto, Long accountantUserId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot process renewal requests");
        ContractActionRequest request = actionRequestRepository.findById(requestId)
                .orElseThrow(() -> AppException.notFound("Request not found: " + requestId));

        if (!"RENEWAL".equals(request.getActionType())) {
            throw AppException.badRequest("This request is not a renewal request");
        }
        if (!STATUS_PENDING.equalsIgnoreCase(request.getStatus())) {
            throw AppException.badRequest("Request already processed");
        }

        ContractRenewalRequestDto ownerApprovalRequest = new ContractRenewalRequestDto();
        ownerApprovalRequest.setProposedStartDate(dto.getNewStartDate());
        ownerApprovalRequest.setProposedEndDate(dto.getNewEndDate());
        ownerApprovalRequest.setProposedRentAmount(dto.getNewMonthlyRent());
        ownerApprovalRequest.setNote(dto.getNotes());
        ContractResponse pendingContract = contractService.requestRenewal(
                request.getContractId(),
                ownerApprovalRequest,
                accountantUserId);

        request.setStatus(STATUS_APPROVED);
        request.setReviewedBy(accountantUserId);
        request.setReviewedAt(LocalDateTime.now());
        String noteAr = appMessages.get(AppMessages.LOCALE_AR, "accountant.renewal.sent_for_owner_approval_note", pendingContract.getContractNumber());
        String noteEn = appMessages.get(AppMessages.LOCALE_EN, "accountant.renewal.sent_for_owner_approval_note", pendingContract.getContractNumber());
        request.setAdminNotes(noteAr + " | " + noteEn);
        actionRequestRepository.save(request);

        return pendingContract;
    }

    private ReceiptWithTenantDto toReceiptWithTenant(RentReceipt r, Tenant tenant) {
        return ReceiptWithTenantDto.builder()
                .id(r.getId())
                .tenantId(r.getTenantId())
                .tenantName(tenant != null ? tenant.getFullName() : null)
                .tenantPhone(tenant != null ? tenant.getPhone() : null)
                .unitId(tenant != null ? tenant.getUnitId() : null)
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

    private RenewalRequestWithDetailsDto toRenewalWithDetails(ContractActionRequest req) {
        ContractResponse contract = null;
        try {
            contract = contractService.getById(req.getContractId());
        } catch (Exception ignored) {}

        Tenant tenant = req.getTenantId() != null
                ? tenantRepository.findById(req.getTenantId()).orElse(null)
                : null;

        return RenewalRequestWithDetailsDto.builder()
                .id(req.getId())
                .tenantId(req.getTenantId())
                .tenantName(tenant != null ? tenant.getFullName() : null)
                .contractId(req.getContractId())
                .contractNumber(contract != null ? contract.getContractNumber() : null)
                .currentMonthlyRent(contract != null ? contract.getMonthlyRent() : null)
                .currentEndDate(contract != null ? contract.getEndDate() : null)
                .requestedDate(req.getRequestedDate())
                .reason(req.getReason())
                .notes(req.getNotes())
                .attachmentUrl(req.getAttachmentUrl())
                .status(req.getStatus())
                .createdAt(req.getCreatedAt())
                .build();
    }

    private String normalizeReviewStatus(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!STATUS_APPROVED.equals(normalized) && !STATUS_REJECTED.equals(normalized)) {
            throw AppException.badRequest("Invalid review status. Expected APPROVED or REJECTED");
        }
        return normalized;
    }
}
