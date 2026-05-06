package com.propertymanagement.modules.contract.lease;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.dto.OwnerApprovalDto;
import com.propertymanagement.modules.contract.lease.dto.OwnerRenewalDecisionDto;
import com.propertymanagement.modules.contract.lease.dto.OwnerTerminationDecisionDto;
import com.propertymanagement.modules.owner.OwnerPropertyAccessService;
import com.propertymanagement.modules.tenant.TenantPortalWelcomeService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OwnerApprovalService {

    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final TenantPortalWelcomeService tenantPortalWelcomeService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public List<ContractResponse> getPendingApprovals(Long ownerId) {
        List<LeaseContract> contracts = (ownerId != null)
                ? contractRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(ownerId, ContractStatus.PENDING_OWNER_APPROVAL)
                : contractRepository.findByStatusOrderByCreatedAtDesc(ContractStatus.PENDING_OWNER_APPROVAL);
        return contracts.stream().map(contractService::toResponse).toList();
    }

    /**
     * Pending termination requests visible to the caller. If the caller is an OWNER user,
     * we limit results to the properties they may access via {@link OwnerPropertyAccessService};
     * staff (SUPER_ADMIN / GENERAL_MANAGER) see every pending request.
     */
    public List<ContractResponse> getPendingTerminations(Long ownerId) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        List<LeaseContract> contracts;
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return List.of();
            }
            contracts = contractRepository.findByStatusAndPropertyIdInOrderByCreatedAtDesc(
                    ContractStatus.PENDING_TERMINATION_APPROVAL, ownerScope);
        } else if (ownerId != null) {
            contracts = contractRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(
                    ownerId, ContractStatus.PENDING_TERMINATION_APPROVAL);
        } else {
            contracts = contractRepository.findByStatusOrderByCreatedAtDesc(
                    ContractStatus.PENDING_TERMINATION_APPROVAL);
        }
        return contracts.stream().map(contractService::toResponse).toList();
    }

    public List<ContractResponse> getPendingRenewals(Long ownerId) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        List<LeaseContract> contracts;
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return List.of();
            }
            contracts = contractRepository.findByStatusAndPropertyIdInOrderByCreatedAtDesc(
                    ContractStatus.PENDING_RENEWAL_APPROVAL, ownerScope);
        } else if (ownerId != null) {
            contracts = contractRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(
                    ownerId, ContractStatus.PENDING_RENEWAL_APPROVAL);
        } else {
            contracts = contractRepository.findByStatusOrderByCreatedAtDesc(
                    ContractStatus.PENDING_RENEWAL_APPROVAL);
        }
        return contracts.stream().map(contractService::toResponse).toList();
    }

    @Transactional
    public ContractResponse processApproval(Long contractId, OwnerApprovalDto dto, Long ownerUserId) {
        LeaseContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + contractId));

        if (contract.getStatus() != ContractStatus.PENDING_OWNER_APPROVAL) {
            throw AppException.badRequest("Contract is not awaiting owner approval");
        }

        boolean approved = "APPROVED".equalsIgnoreCase(dto.getDecision());

        contract.setOwnerApprovalStatus(approved ? "APPROVED" : "REJECTED");
        contract.setOwnerApprovalNotes(dto.getNotes());
        contract.setOwnerApprovedAt(LocalDateTime.now());
        contract.setOwnerApprovedBy(ownerUserId);

        if (approved) {
            contract.setStatus(ContractStatus.ACTIVE);
            contract.setApprovedBy(ownerUserId);
            contractService.appendContractActivationAudit(contract, ownerUserId, "owner approval decision");
            contractRepository.save(contract);
            contractService.runPostActivationSideEffects(contractId);
        } else {
            contract.setStatus(ContractStatus.DRAFT);
            LeaseContract savedRejected = contractRepository.save(contract);
            try {
                tenantPortalWelcomeService.notifyTenantOwnerDeniedPendingApproval(savedRejected, dto.getNotes());
            } catch (Exception ignored) {
                // Notification must not roll back decision
            }
            try {
                tenantPortalWelcomeService.notifyAccountantsOfDraftRejected(savedRejected, dto.getNotes());
            } catch (Exception ignored) {
                // Notification must not roll back decision
            }
        }

        return contractService.toResponse(contractRepository.findById(contractId).orElse(contract));
    }

    /**
     * Owner approves or rejects a pending termination request. APPROVED finalises to
     * {@link ContractStatus#TERMINATED} (waives schedule, syncs unit); REJECTED reverts
     * to {@link ContractStatus#ACTIVE}. Notifications fan out to accountants + tenant.
     */
    @Transactional
    public ContractResponse processTerminationDecision(Long contractId,
                                                       OwnerTerminationDecisionDto dto,
                                                       Long ownerUserId) {
        LeaseContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + contractId));

        // OWNER role may only act on properties they're linked to; non-owner staff bypass this.
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());

        if (contract.getStatus() != ContractStatus.PENDING_TERMINATION_APPROVAL) {
            throw AppException.badRequest("Contract is not awaiting termination approval");
        }

        boolean approved = "APPROVED".equalsIgnoreCase(dto.getDecision());
        if (approved) {
            return contractService.finalizeTerminationApproval(contractId, ownerUserId, dto.getNotes());
        }
        return contractService.finalizeTerminationRejection(contractId, ownerUserId, dto.getNotes());
    }

    @Transactional
    public ContractResponse processRenewalDecision(Long contractId,
                                                   OwnerRenewalDecisionDto dto,
                                                   Long ownerUserId) {
        LeaseContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + contractId));
        ownerPropertyAccessService.assertOwnerCanAccessProperty(contract.getPropertyId());
        if (contract.getStatus() != ContractStatus.PENDING_RENEWAL_APPROVAL) {
            throw AppException.badRequest("error.contract.renewal.decision.no_longer_pending");
        }
        boolean approved = "APPROVED".equalsIgnoreCase(dto.getDecision());
        if (!approved && (dto.getNotes() == null || dto.getNotes().isBlank())) {
            throw AppException.badRequest("error.contract.renewal.decision.reject_note_required");
        }
        if (approved) {
            return contractService.finalizeRenewalApproval(contractId, ownerUserId, dto.getNotes());
        }
        return contractService.finalizeRenewalRejection(contractId, ownerUserId, dto.getNotes());
    }
}
