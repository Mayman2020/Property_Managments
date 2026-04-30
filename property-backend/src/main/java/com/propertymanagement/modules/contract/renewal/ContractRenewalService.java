package com.propertymanagement.modules.contract.renewal;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContract;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.renewal.dto.RenewContractDto;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class ContractRenewalService {

    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final ContractRenewalRepository renewalRepository;

    @Transactional
    public ContractResponse renew(Long originalId, RenewContractDto dto, Long renewedByUserId) {
        LeaseContract original = contractRepository.findById(originalId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + originalId));

        if (original.getStatus() != ContractStatus.ACTIVE && original.getStatus() != ContractStatus.EXPIRED) {
            throw AppException.badRequest("Only ACTIVE or EXPIRED contracts can be renewed");
        }

        // Validate max 12 months
        long months = ChronoUnit.MONTHS.between(dto.getNewStartDate(), dto.getNewEndDate());
        if (months > 12) {
            throw AppException.badRequest("Contract duration cannot exceed 12 months");
        }

        String year = String.valueOf(LocalDate.now().getYear());
        long count = contractRepository.countByContractNumberStartingWith("CNT-" + year);
        String newNumber = String.format("CNT-%s-%05d", year, count + 1);

        int freeMonths = dto.getFreeMonths() != null ? dto.getFreeMonths() : 0;

        LeaseContract newContract = LeaseContract.builder()
                .contractNumber(newNumber)
                .tenantId(original.getTenantId())
                .unitId(original.getUnitId())
                .propertyId(original.getPropertyId())
                .ownerId(original.getOwnerId())
                .templateId(original.getTemplateId())
                .startDate(dto.getNewStartDate())
                .endDate(dto.getNewEndDate())
                .monthlyRent(dto.getNewMonthlyRent())
                .securityDeposit(dto.getNewSecurityDeposit() != null ? dto.getNewSecurityDeposit() : original.getSecurityDeposit())
                .paymentFrequency(original.getPaymentFrequency())
                .paymentDay(original.getPaymentDay())
                .currency(original.getCurrency())
                .status(ContractStatus.PENDING_OWNER_APPROVAL)
                .ownerApprovalStatus("PENDING")
                .freeMonths(freeMonths)
                .autoRenewable(original.isAutoRenewable())
                .renewalNoticeDays(original.getRenewalNoticeDays())
                .contractPdfUrl(dto.getContractPdfUrl())
                .createdByUserId(renewedByUserId)
                .notes(dto.getNotes())
                .build();

        LeaseContract savedNew = contractRepository.save(newContract);

        // Do NOT mark original as RENEWED yet — wait for owner approval
        // Original stays ACTIVE until the new contract is approved

        BigDecimal increasePct = null;
        if (original.getMonthlyRent() != null && original.getMonthlyRent().compareTo(BigDecimal.ZERO) > 0) {
            increasePct = dto.getNewMonthlyRent()
                    .subtract(original.getMonthlyRent())
                    .divide(original.getMonthlyRent(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        ContractRenewal renewal = ContractRenewal.builder()
                .originalContractId(originalId)
                .newContractId(savedNew.getId())
                .renewalDate(LocalDate.now())
                .newStartDate(dto.getNewStartDate())
                .newEndDate(dto.getNewEndDate())
                .oldMonthlyRent(original.getMonthlyRent())
                .newMonthlyRent(dto.getNewMonthlyRent())
                .rentIncreasePct(increasePct)
                .freeMonths(freeMonths)
                .renewedBy(renewedByUserId)
                .notes(dto.getNotes())
                .build();
        renewalRepository.save(renewal);

        return contractService.toResponse(savedNew);
    }

    // Called when owner approves a renewal — finalize it
    @Transactional
    public void finalizeRenewal(Long newContractId) {
        renewalRepository.findByNewContractId(newContractId).ifPresent(renewal -> {
            contractRepository.findById(renewal.getOriginalContractId()).ifPresent(original -> {
                original.setStatus(ContractStatus.RENEWED);
                contractRepository.save(original);
            });
        });
    }
}
