package com.propertymanagement.modules.contract;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contract.lease.service.OwnerApprovalService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.dto.OwnerApprovalDto;
import com.propertymanagement.modules.contract.lease.dto.OwnerTerminationDecisionDto;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.tenant.service.TenantPortalWelcomeService;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerApprovalServiceTest {

    @Mock LeaseContractRepository contractRepository;
    @Mock LeaseContractService contractService;
    @Mock TenantPortalWelcomeService tenantPortalWelcomeService;
    @Mock OwnerPropertyAccessService ownerPropertyAccessService;
    @Mock TenantRepository tenantRepository;
    @Mock UserRepository userRepository;

    @InjectMocks OwnerApprovalService service;

    // ── PROCESS APPROVAL - APPROVED ───────────────────────────────────────

    @Test
    void processApproval_approved_activatesContract() {
        LeaseContract contract = buildPendingContract(5L);
        when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
        when(contractRepository.save(any())).thenReturn(contract);
        when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));

        ContractResponse mockResponse = ContractResponse.builder().build();
        when(contractService.toResponse(any())).thenReturn(mockResponse);
        doNothing().when(contractService).runPostActivationSideEffects(5L);

        OwnerApprovalDto dto = new OwnerApprovalDto();
        dto.setDecision("APPROVED");

        service.processApproval(5L, dto, 99L);

        verify(contractRepository).save(argThat(c ->
                c.getStatus() == ContractStatus.ACTIVE
                && "APPROVED".equals(c.getOwnerApprovalStatus())));
        verify(contractService).runPostActivationSideEffects(5L);
    }

    @Test
    void processApproval_rejected_revertsToDraft() {
        LeaseContract contract = buildPendingContract(6L);
        when(contractRepository.findById(6L)).thenReturn(Optional.of(contract));
        when(contractRepository.save(any())).thenReturn(contract);

        ContractResponse mockResponse = ContractResponse.builder().build();
        when(contractService.toResponse(any())).thenReturn(mockResponse);

        OwnerApprovalDto dto = new OwnerApprovalDto();
        dto.setDecision("REJECTED");
        dto.setNotes("Price too high");

        service.processApproval(6L, dto, 99L);

        verify(contractRepository).save(argThat(c ->
                c.getStatus() == ContractStatus.DRAFT
                && "REJECTED".equals(c.getOwnerApprovalStatus())));
        verify(contractService, never()).runPostActivationSideEffects(anyLong());
    }

    @Test
    void processApproval_throwsBadRequest_whenContractNotPendingOwnerApproval() {
        LeaseContract activeContract = buildContract(7L, ContractStatus.ACTIVE);
        when(contractRepository.findById(7L)).thenReturn(Optional.of(activeContract));

        OwnerApprovalDto dto = new OwnerApprovalDto();
        dto.setDecision("APPROVED");

        assertThatThrownBy(() -> service.processApproval(7L, dto, 99L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("awaiting owner approval");
    }

    @Test
    void processApproval_throwsNotFound_whenContractDoesNotExist() {
        when(contractRepository.findById(999L)).thenReturn(Optional.empty());

        OwnerApprovalDto dto = new OwnerApprovalDto();
        dto.setDecision("APPROVED");

        assertThatThrownBy(() -> service.processApproval(999L, dto, 99L))
                .isInstanceOf(AppException.class);
    }

    // ── PROCESS TERMINATION DECISION ──────────────────────────────────────

    @Test
    void processTerminationDecision_throwsBadRequest_whenContractNotPendingTermination() {
        LeaseContract activeContract = buildContract(8L, ContractStatus.ACTIVE);
        when(contractRepository.findById(8L)).thenReturn(Optional.of(activeContract));

        OwnerTerminationDecisionDto dto = new OwnerTerminationDecisionDto();
        dto.setDecision("APPROVED");

        assertThatThrownBy(() -> service.processTerminationDecision(8L, dto, 99L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("awaiting termination approval");
    }

    @Test
    void processTerminationDecision_approved_callsFinalizeTermination() {
        LeaseContract pendingTermination = buildContract(9L, ContractStatus.PENDING_TERMINATION_APPROVAL);
        when(contractRepository.findById(9L)).thenReturn(Optional.of(pendingTermination));

        ContractResponse mockResponse = ContractResponse.builder().build();
        when(contractService.finalizeTerminationApproval(9L, 99L, "ok")).thenReturn(mockResponse);

        OwnerTerminationDecisionDto dto = new OwnerTerminationDecisionDto();
        dto.setDecision("APPROVED");
        dto.setNotes("ok");

        service.processTerminationDecision(9L, dto, 99L);

        verify(contractService).finalizeTerminationApproval(9L, 99L, "ok");
    }

    // ── GET PENDING APPROVALS ─────────────────────────────────────────────

    @Test
    void getPendingApprovals_returnsContractsForOwner() {
        LeaseContract c1 = buildPendingContract(1L);
        LeaseContract c2 = buildPendingContract(2L);
        when(contractRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(20L, ContractStatus.PENDING_OWNER_APPROVAL))
                .thenReturn(List.of(c1, c2));
        when(contractService.toResponse(any())).thenReturn(ContractResponse.builder().build());

        List<ContractResponse> result = service.getPendingApprovals(20L);

        assertThat(result).hasSize(2);
    }

    @Test
    void getPendingApprovals_returnsEmpty_whenOwnerHasNoProperties() {
        when(contractRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(
                20L, ContractStatus.PENDING_OWNER_APPROVAL)).thenReturn(List.of());

        List<ContractResponse> result = service.getPendingApprovals(20L);

        assertThat(result).isEmpty();
    }

    // ── HELPERS ──────────────────────────────────────────────────────────

    private LeaseContract buildPendingContract(Long id) {
        return buildContract(id, ContractStatus.PENDING_OWNER_APPROVAL);
    }

    private LeaseContract buildContract(Long id, ContractStatus status) {
        return LeaseContract.builder()
                .id(id)
                .contractNumber("CNT-" + id)
                .propertyId(10L)
                .unitId(5L)
                .tenantId(3L)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .monthlyRent(BigDecimal.valueOf(400))
                .securityDeposit(BigDecimal.ZERO)
                .currency("OMR")
                .status(status)
                .build();
    }
}
