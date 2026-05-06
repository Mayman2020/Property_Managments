package com.propertymanagement.modules.contract.renewal;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContract;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.renewal.dto.ContractRenewalContextResponse;
import com.propertymanagement.modules.contract.renewal.dto.MaintenanceRenewalSnippetDto;
import com.propertymanagement.modules.contract.renewal.dto.RenewContractDto;
import com.propertymanagement.modules.contract.renewal.dto.RenewalChainContractDto;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.RequestStatus;
import com.propertymanagement.modules.tenant.TenantPortalWelcomeService;
import com.propertymanagement.modules.unit.UnitService;
import com.propertymanagement.modules.unit.dto.UnitResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ContractRenewalService {

    private static final List<RequestStatus> NON_TERMINAL_MAINTENANCE_STATUSES = List.of(
            RequestStatus.PENDING,
            RequestStatus.ASSIGNED,
            RequestStatus.SCHEDULED,
            RequestStatus.IN_PROGRESS,
            RequestStatus.TENANT_ABSENT,
            RequestStatus.NEEDS_REVISIT);

    private static final List<RequestStatus> SCHEDULED_OR_ACTIVE_MAINTENANCE = List.of(
            RequestStatus.SCHEDULED,
            RequestStatus.IN_PROGRESS);

    private final LeaseContractRepository contractRepository;
    private final LeaseContractService contractService;
    private final TenantPortalWelcomeService tenantPortalWelcomeService;
    private final ContractRenewalRepository renewalRepository;
    private final UnitService unitService;
    private final MaintenanceRequestRepository maintenanceRequestRepository;

    @Transactional(readOnly = true)
    public ContractRenewalContextResponse getRenewalContext(Long contractId) {
        LeaseContract current = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + contractId));

        List<LeaseContract> chainFromRoot = buildRenewalChainBackward(current);
        LeaseContract root = chainFromRoot.get(0);

        List<RenewalChainContractDto> chainDtos = chainFromRoot.stream()
                .map(c -> RenewalChainContractDto.builder()
                        .id(c.getId())
                        .contractNumber(c.getContractNumber())
                        .startDate(c.getStartDate())
                        .endDate(c.getEndDate())
                        .status(c.getStatus() != null ? c.getStatus().name() : null)
                        .freeMonths(c.getFreeMonths())
                        .hasFreeMonth(c.getHasFreeMonth())
                        .build())
                .toList();

        int priorRenewalCount = Math.max(0, chainFromRoot.size() - 1);

        Optional<UnitResponse> unitOpt = unitService.findByIdForContext(current.getUnitId());
        Long unitId = current.getUnitId();
        long openMaint = 0;
        long scheduledOrActive = 0;
        List<MaintenanceRenewalSnippetDto> samples = List.of();
        if (unitId != null) {
            openMaint = maintenanceRequestRepository.countByUnitIdAndStatuses(unitId, NON_TERMINAL_MAINTENANCE_STATUSES);
            scheduledOrActive = maintenanceRequestRepository.countByUnitIdAndStatuses(unitId, SCHEDULED_OR_ACTIVE_MAINTENANCE);
            Sort maintSort = Sort.by(
                    Sort.Order.asc("scheduledDate").nullsLast(),
                    Sort.Order.desc("createdAt"));
            List<MaintenanceRequest> rows = maintenanceRequestRepository.findByUnitIdAndStatuses(
                    unitId, NON_TERMINAL_MAINTENANCE_STATUSES, PageRequest.of(0, 5, maintSort));
            samples = rows.stream()
                    .map(r -> MaintenanceRenewalSnippetDto.builder()
                            .id(r.getId())
                            .requestNumber(r.getRequestNumber())
                            .title(r.getTitle())
                            .status(r.getStatus() != null ? r.getStatus().name() : null)
                            .scheduledDate(r.getScheduledDate())
                            .build())
                    .toList();
        }

        return ContractRenewalContextResponse.builder()
                .contract(contractService.toResponse(current))
                .unit(unitOpt.orElse(null))
                .rootContractStartDate(root.getStartDate())
                .currentContractEndDate(current.getEndDate())
                .priorRenewalCount(priorRenewalCount)
                .renewalChain(chainDtos)
                .currentContractFreeMonths(current.getFreeMonths())
                .currentContractHasFreeMonth(Boolean.TRUE.equals(current.getHasFreeMonth())
                        || (current.getFreeMonths() != null && current.getFreeMonths() > 0))
                .openMaintenanceRequestCount(openMaint)
                .scheduledOrActiveMaintenanceCount(scheduledOrActive)
                .openMaintenanceSamples(samples)
                .build();
    }

    /**
     * Ordered from root (original lease) to {@code current}.
     */
    private List<LeaseContract> buildRenewalChainBackward(LeaseContract current) {
        List<LeaseContract> backward = new ArrayList<>();
        LeaseContract node = current;
        backward.add(node);
        int guard = 0;
        while (guard++ < 64) {
            Optional<ContractRenewal> parent = renewalRepository.findByNewContractId(node.getId());
            if (parent.isEmpty()) {
                break;
            }
            LeaseContract orig = contractRepository.findById(parent.get().getOriginalContractId()).orElse(null);
            if (orig == null) {
                break;
            }
            backward.add(orig);
            node = orig;
        }
        Collections.reverse(backward);
        return backward;
    }

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
        boolean hasFreeMonth = freeMonths > 0;

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
                .status(ContractStatus.DRAFT)
                .freeMonths(freeMonths)
                .hasFreeMonth(hasFreeMonth)
                .autoRenewable(original.isAutoRenewable())
                .renewalNoticeDays(original.getRenewalNoticeDays())
                .contractPdfUrl(dto.getContractPdfUrl())
                .createdByUserId(renewedByUserId)
                .notes(dto.getNotes())
                .build();

        LeaseContract savedNew = contractRepository.save(newContract);
        contractService.syncUnitRentedFromContracts(savedNew.getUnitId());
        contractService.notifyOwnersOfDraftContract(savedNew);
        tenantPortalWelcomeService.notifyTenantDraftLeasePendingOwner(savedNew);

        // Original stays ACTIVE until an admin activates the new DRAFT contract (same as a new lease).

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

    /**
     * Final materialization step for owner-approved renewal requests.
     * Keeps the existing enterprise renewal pattern (new linked contract + renewal row)
     * but creates the new contract directly as ACTIVE because owner approval already happened.
     */
    @Transactional
    public ContractResponse approvePendingRenewal(Long originalId, Long approvedByUserId, String ownerNotes) {
        LeaseContract original = contractRepository.findByIdForUpdate(originalId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + originalId));
        if (original.getStatus() != ContractStatus.PENDING_RENEWAL_APPROVAL) {
            // Idempotency: if already processed, return existing generated contract instead of creating another one.
            ContractResponse existing = findExistingApprovedRenewalResult(originalId);
            if (existing != null) {
                return existing;
            }
            throw AppException.badRequest("error.contract.renewal.decision.no_longer_pending");
        }
        if (original.getRenewalProposedStartDate() == null
                || original.getRenewalProposedEndDate() == null
                || original.getRenewalProposedRentAmount() == null) {
            throw AppException.badRequest("error.contract.renewal.request.missing_proposal");
        }

        Optional<ContractRenewal> existingRenewal = renewalRepository.findFirstByOriginalContractIdOrderByCreatedAtDesc(originalId);
        if (existingRenewal.isPresent()) {
            Long existingNewId = existingRenewal.get().getNewContractId();
            if (existingNewId != null) {
                return contractRepository.findById(existingNewId)
                        .map(contractService::toResponse)
                        .orElseThrow(() -> AppException.badRequest("error.contract.renewal.duplicate_prevented"));
            }
            throw AppException.badRequest("error.contract.renewal.duplicate_prevented");
        }

        String year = String.valueOf(LocalDate.now().getYear());
        long count = contractRepository.countByContractNumberStartingWith("CNT-" + year);
        String newNumber = String.format("CNT-%s-%05d", year, count + 1);

        LeaseContract newContract = LeaseContract.builder()
                .contractNumber(newNumber)
                .tenantId(original.getTenantId())
                .unitId(original.getUnitId())
                .propertyId(original.getPropertyId())
                .ownerId(original.getOwnerId())
                .templateId(original.getTemplateId())
                .startDate(original.getRenewalProposedStartDate())
                .endDate(original.getRenewalProposedEndDate())
                .monthlyRent(original.getRenewalProposedRentAmount())
                .securityDeposit(original.getSecurityDeposit())
                .paymentFrequency(original.getPaymentFrequency())
                .paymentDay(original.getPaymentDay())
                .currency(original.getCurrency())
                .status(ContractStatus.ACTIVE)
                .freeMonths(original.getFreeMonths())
                .hasFreeMonth(Boolean.TRUE.equals(original.getHasFreeMonth()))
                .autoRenewable(original.isAutoRenewable())
                .renewalNoticeDays(original.getRenewalNoticeDays())
                .contractPdfUrl(original.getContractPdfUrl())
                .approvedBy(approvedByUserId)
                .createdByUserId(original.getRenewalRequestedBy())
                .notes(original.getRenewalRequestedNote())
                .build();

        LeaseContract savedNew = contractRepository.save(newContract);
        contractService.appendContractActivationAudit(savedNew, approvedByUserId, "owner renewal approval");
        contractRepository.save(savedNew);

        BigDecimal increasePct = null;
        if (original.getMonthlyRent() != null && original.getMonthlyRent().compareTo(BigDecimal.ZERO) > 0) {
            increasePct = original.getRenewalProposedRentAmount()
                    .subtract(original.getMonthlyRent())
                    .divide(original.getMonthlyRent(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        ContractRenewal renewal = ContractRenewal.builder()
                .originalContractId(originalId)
                .newContractId(savedNew.getId())
                .renewalDate(LocalDate.now())
                .newStartDate(original.getRenewalProposedStartDate())
                .newEndDate(original.getRenewalProposedEndDate())
                .oldMonthlyRent(original.getMonthlyRent())
                .newMonthlyRent(original.getRenewalProposedRentAmount())
                .rentIncreasePct(increasePct)
                .freeMonths(original.getFreeMonths() != null ? original.getFreeMonths() : 0)
                .renewedBy(approvedByUserId)
                .notes(ownerNotes)
                .build();
        renewalRepository.save(renewal);

        // Explicitly close the source contract only after the renewed contract was created and linked.
        original.setStatus(ContractStatus.RENEWED);
        contractRepository.save(original);

        contractService.runPostActivationSideEffects(savedNew.getId());
        return contractService.toResponse(contractRepository.findById(savedNew.getId()).orElse(savedNew));
    }

    @Transactional(readOnly = true)
    public ContractResponse findExistingApprovedRenewalResult(Long originalContractId) {
        return renewalRepository.findFirstByOriginalContractIdOrderByCreatedAtDesc(originalContractId)
                .map(ContractRenewal::getNewContractId)
                .flatMap(contractRepository::findById)
                .map(contractService::toResponse)
                .orElse(null);
    }

    /** Marks the prior contract RENEWED when the new renewal contract is activated (admin). */
    @Transactional
    public void finalizeRenewal(Long newContractId) {
        renewalRepository.findByNewContractId(newContractId).ifPresent(renewal -> {
            contractRepository.findById(renewal.getOriginalContractId()).ifPresent(original -> {
                if (original.getStatus() != ContractStatus.RENEWED) {
                    original.setStatus(ContractStatus.RENEWED);
                    contractRepository.save(original);
                    contractService.syncUnitRentedFromContracts(original.getUnitId());
                }
            });
            contractRepository.findById(newContractId).ifPresent(nc ->
                    contractService.syncUnitRentedFromContracts(nc.getUnitId()));
        });
    }
}
