package com.propertymanagement.modules.contract.lease;

import com.propertymanagement.modules.contract.lease.dto.*;
import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.contract.payment.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.RentPaymentScheduleRepository;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaseContractService {

    private final LeaseContractRepository contractRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final OwnerRepository ownerRepository;
    private final CodeGenerationService codeGenerationService;

    public Page<ContractResponse> getAll(Pageable pageable) {
        return contractRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<ContractResponse> getByStatus(ContractStatus status, Pageable pageable) {
        return contractRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    public ContractResponse getById(Long id) {
        return toResponse(findById(id));
    }

    public List<ContractSummaryDto> getByTenant(Long tenantId) {
        return contractRepository.findByTenantId(tenantId).stream()
                .map(this::toSummary)
                .toList();
    }

    public List<ContractSummaryDto> getExpiring(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        return contractRepository.findExpiringBetween(LocalDate.now(), cutoff).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public ContractResponse create(CreateContractDto dto) {
        String contractNumber = codeGenerationService.generate("CNT");

        LeaseContract contract = LeaseContract.builder()
                .contractNumber(contractNumber)
                .tenantId(dto.getTenantId())
                .unitId(dto.getUnitId())
                .propertyId(dto.getPropertyId())
                .ownerId(dto.getOwnerId())
                .templateId(dto.getTemplateId())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .signingDate(dto.getSigningDate())
                .monthlyRent(dto.getMonthlyRent())
                .securityDeposit(dto.getSecurityDeposit() != null ? dto.getSecurityDeposit() : BigDecimal.ZERO)
                .paymentFrequency(dto.getPaymentFrequency() != null ? dto.getPaymentFrequency() : PaymentFrequency.MONTHLY)
                .paymentDay(dto.getPaymentDay() != null ? dto.getPaymentDay() : 1)
                .currency(dto.getCurrency() != null ? dto.getCurrency() : "OMR")
                .autoRenewable(Boolean.TRUE.equals(dto.getAutoRenewable()))
                .renewalNoticeDays(dto.getRenewalNoticeDays() != null ? dto.getRenewalNoticeDays() : 30)
                .notes(dto.getNotes())
                .status(ContractStatus.DRAFT)
                .build();

        return toResponse(contractRepository.save(contract));
    }

    @Transactional
    public ContractResponse update(Long id, CreateContractDto dto) {
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw AppException.badRequest("Only DRAFT contracts can be edited");
        }
        contract.setTenantId(dto.getTenantId());
        contract.setUnitId(dto.getUnitId());
        contract.setPropertyId(dto.getPropertyId());
        contract.setOwnerId(dto.getOwnerId());
        contract.setTemplateId(dto.getTemplateId());
        contract.setStartDate(dto.getStartDate());
        contract.setEndDate(dto.getEndDate());
        contract.setSigningDate(dto.getSigningDate());
        contract.setMonthlyRent(dto.getMonthlyRent());
        if (dto.getSecurityDeposit() != null) contract.setSecurityDeposit(dto.getSecurityDeposit());
        if (dto.getPaymentFrequency() != null) contract.setPaymentFrequency(dto.getPaymentFrequency());
        if (dto.getPaymentDay() != null) contract.setPaymentDay(dto.getPaymentDay());
        if (dto.getCurrency() != null) contract.setCurrency(dto.getCurrency());
        if (dto.getAutoRenewable() != null) contract.setAutoRenewable(dto.getAutoRenewable());
        if (dto.getRenewalNoticeDays() != null) contract.setRenewalNoticeDays(dto.getRenewalNoticeDays());
        contract.setNotes(dto.getNotes());
        return toResponse(contractRepository.save(contract));
    }

    @Transactional
    public ContractResponse activate(Long id) {
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw AppException.badRequest("Only DRAFT contracts can be activated");
        }
        contract.setStatus(ContractStatus.ACTIVE);
        contractRepository.save(contract);
        generatePaymentSchedule(contract);
        return toResponse(contract);
    }

    @Transactional
    public ContractResponse terminate(Long id, TerminateContractDto dto) {
        LeaseContract contract = findById(id);
        if (contract.getStatus() != ContractStatus.ACTIVE && contract.getStatus() != ContractStatus.SUSPENDED) {
            throw AppException.badRequest("Only ACTIVE or SUSPENDED contracts can be terminated");
        }
        contract.setStatus(ContractStatus.TERMINATED);
        contract.setTerminationDate(dto.getTerminationDate());
        contract.setTerminationReason(dto.getTerminationReason());
        scheduleRepository.waiveRemainingSchedule(id, dto.getTerminationDate());
        return toResponse(contractRepository.save(contract));
    }

    private void generatePaymentSchedule(LeaseContract contract) {
        int day = contract.getPaymentDay();
        if (day < 1 || day > 28) day = 1;

        LocalDate currentDate = contract.getStartDate().withDayOfMonth(day);
        if (currentDate.isBefore(contract.getStartDate())) {
            currentDate = currentDate.plusMonths(1);
        }

        while (!currentDate.isAfter(contract.getEndDate())) {
            LocalDate periodEnd = nextPeriodEnd(currentDate, contract.getPaymentFrequency());

            RentPaymentSchedule schedule = RentPaymentSchedule.builder()
                    .contractId(contract.getId())
                    .dueDate(currentDate)
                    .amount(calculateInstallmentAmount(contract))
                    .periodFrom(currentDate)
                    .periodTo(periodEnd.isAfter(contract.getEndDate()) ? contract.getEndDate() : periodEnd)
                    .status(PaymentScheduleStatus.PENDING)
                    .build();
            scheduleRepository.save(schedule);

            currentDate = advanceByFrequency(currentDate, contract.getPaymentFrequency());
        }
    }

    private BigDecimal calculateInstallmentAmount(LeaseContract contract) {
        return switch (contract.getPaymentFrequency()) {
            case MONTHLY -> contract.getMonthlyRent();
            case QUARTERLY -> contract.getMonthlyRent().multiply(BigDecimal.valueOf(3));
            case SEMI_ANNUAL -> contract.getMonthlyRent().multiply(BigDecimal.valueOf(6));
            case ANNUAL -> contract.getMonthlyRent().multiply(BigDecimal.valueOf(12));
        };
    }

    private LocalDate nextPeriodEnd(LocalDate from, PaymentFrequency freq) {
        return switch (freq) {
            case MONTHLY -> from.plusMonths(1).minusDays(1);
            case QUARTERLY -> from.plusMonths(3).minusDays(1);
            case SEMI_ANNUAL -> from.plusMonths(6).minusDays(1);
            case ANNUAL -> from.plusYears(1).minusDays(1);
        };
    }

    private LocalDate advanceByFrequency(LocalDate from, PaymentFrequency freq) {
        return switch (freq) {
            case MONTHLY -> from.plusMonths(1);
            case QUARTERLY -> from.plusMonths(3);
            case SEMI_ANNUAL -> from.plusMonths(6);
            case ANNUAL -> from.plusYears(1);
        };
    }

    public LeaseContract findById(Long id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Lease contract not found: " + id));
    }

    public ContractResponse toResponse(LeaseContract c) {
        String tenantName = c.getTenantId() != null
                ? tenantRepository.findById(c.getTenantId()).map(t -> t.getFullName()).orElse(null)
                : null;
        String unitNumber = c.getUnitId() != null
                ? unitRepository.findById(c.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;
        String propertyName = c.getPropertyId() != null
                ? propertyRepository.findById(c.getPropertyId()).map(p -> p.getPropertyName()).orElse(null)
                : null;
        String ownerName = c.getOwnerId() != null
                ? ownerRepository.findById(c.getOwnerId()).map(o -> o.getFullName()).orElse(null)
                : null;

        long daysUntilExpiry = c.getEndDate() != null
                ? ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate())
                : 0;

        return ContractResponse.builder()
                .id(c.getId())
                .contractNumber(c.getContractNumber())
                .tenantId(c.getTenantId())
                .tenantName(tenantName)
                .unitId(c.getUnitId())
                .unitNumber(unitNumber)
                .propertyId(c.getPropertyId())
                .propertyName(propertyName)
                .ownerId(c.getOwnerId())
                .ownerName(ownerName)
                .templateId(c.getTemplateId())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .signingDate(c.getSigningDate())
                .monthlyRent(c.getMonthlyRent())
                .annualRent(c.getAnnualRent())
                .securityDeposit(c.getSecurityDeposit())
                .paymentFrequency(c.getPaymentFrequency() != null ? c.getPaymentFrequency().name() : null)
                .paymentDay(c.getPaymentDay())
                .currency(c.getCurrency())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .autoRenewable(c.isAutoRenewable())
                .renewalNoticeDays(c.getRenewalNoticeDays())
                .contractPdfUrl(c.getContractPdfUrl())
                .signedPdfUrl(c.getSignedPdfUrl())
                .terminationDate(c.getTerminationDate())
                .terminationReason(c.getTerminationReason())
                .notes(c.getNotes())
                .freeMonths(c.getFreeMonths())
                .ownerApprovalStatus(c.getOwnerApprovalStatus())
                .ownerApprovalNotes(c.getOwnerApprovalNotes())
                .daysUntilExpiry(daysUntilExpiry)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private ContractSummaryDto toSummary(LeaseContract c) {
        String tenantName = c.getTenantId() != null
                ? tenantRepository.findById(c.getTenantId()).map(t -> t.getFullName()).orElse(null)
                : null;
        String unitNumber = c.getUnitId() != null
                ? unitRepository.findById(c.getUnitId()).map(u -> u.getUnitNumber()).orElse(null)
                : null;
        String propertyName = c.getPropertyId() != null
                ? propertyRepository.findById(c.getPropertyId()).map(p -> p.getPropertyName()).orElse(null)
                : null;

        long daysUntilExpiry = c.getEndDate() != null
                ? ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate())
                : 0;

        return ContractSummaryDto.builder()
                .id(c.getId())
                .contractNumber(c.getContractNumber())
                .tenantId(c.getTenantId())
                .tenantName(tenantName)
                .unitId(c.getUnitId())
                .unitNumber(unitNumber)
                .propertyName(propertyName)
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .monthlyRent(c.getMonthlyRent())
                .currency(c.getCurrency())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .daysUntilExpiry(daysUntilExpiry)
                .build();
    }
}
