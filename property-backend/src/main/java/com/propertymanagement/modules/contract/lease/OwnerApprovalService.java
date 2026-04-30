package com.propertymanagement.modules.contract.lease;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.dto.OwnerApprovalDto;
import com.propertymanagement.modules.contract.renewal.ContractRenewalService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OwnerApprovalService {

    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final ContractRenewalService renewalService;

    public List<ContractResponse> getPendingApprovals(Long ownerId) {
        List<LeaseContract> contracts = (ownerId != null)
                ? contractRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(ownerId, ContractStatus.PENDING_OWNER_APPROVAL)
                : contractRepository.findByStatusOrderByCreatedAtDesc(ContractStatus.PENDING_OWNER_APPROVAL);
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
            contractRepository.save(contract);
            // If this is a renewal, mark the original contract as RENEWED
            renewalService.finalizeRenewal(contractId);
        } else {
            contract.setStatus(ContractStatus.DRAFT);
            contractRepository.save(contract);
        }

        return contractService.toResponse(contract);
    }
}
