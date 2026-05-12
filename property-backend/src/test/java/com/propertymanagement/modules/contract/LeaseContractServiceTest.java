package com.propertymanagement.modules.contract;

import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.dto.CreateContractDto;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.contract.renewal.service.ContractRenewalService;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.service.TenantPortalWelcomeService;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.security.PropertyScopeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaseContractServiceTest {

    @Mock LeaseContractRepository contractRepository;
    @Mock RentPaymentScheduleRepository scheduleRepository;
    @Mock TenantRepository tenantRepository;
    @Mock UnitRepository unitRepository;
    @Mock PropertyRepository propertyRepository;
    @Mock OwnerRepository ownerRepository;
    @Mock UserRepository userRepository;
    @Mock CodeGenerationService codeGenerationService;
    @Mock ObjectProvider<ContractRenewalService> contractRenewalServiceProvider;
    @Mock TenantPortalWelcomeService tenantPortalWelcomeService;
    @Mock OwnerPropertyAccessService ownerPropertyAccessService;
    @Mock PropertyScopeService propertyScopeService;
    @Mock NotificationService notificationService;
    @Mock PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;

    @InjectMocks LeaseContractService service;

    private User adminUser;
    private Property property;
    private Unit unit;
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        setSecurityContext(adminUser);

        property = Property.builder().id(10L).ownerId(20L).propertyName("Test Property").build();
        unit = Unit.builder().id(5L).propertyId(10L).unitNumber("U-101").rentAmount(BigDecimal.valueOf(500)).build();
        tenant = Tenant.builder().id(3L).fullName("Test Tenant").build();
    }

    // ── CREATE ────────────────────────────────────────────────────────────

    @Test
    void create_persistsDraftContract() {
        when(codeGenerationService.generate("CNT")).thenReturn("CNT-001");
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(propertyOwnerPortalRecipientService.portalRecipientUserIds(anyLong())).thenReturn(List.of());

        LeaseContract savedContract = buildDraftContract(1L, 10L, 5L, 3L);
        when(contractRepository.save(any())).thenReturn(savedContract);
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L), anyList())).thenReturn(0L);
        when(unitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(tenantRepository.findById(3L)).thenReturn(Optional.of(tenant));
        when(unitRepository.findById(5L)).thenReturn(Optional.of(unit));

        CreateContractDto dto = buildCreateContractDto(3L, 5L, 10L);
        ContractResponse result = service.create(dto);

        assertThat(result).isNotNull();
        verify(contractRepository).save(any(LeaseContract.class));
        verify(codeGenerationService).generate("CNT");
    }

    @Test
    void create_setsStatusToDraft() {
        when(codeGenerationService.generate("CNT")).thenReturn("CNT-002");
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(propertyOwnerPortalRecipientService.portalRecipientUserIds(anyLong())).thenReturn(List.of());
        when(tenantRepository.findById(3L)).thenReturn(Optional.of(tenant));
        when(unitRepository.findById(5L)).thenReturn(Optional.of(unit));

        LeaseContract savedContract = buildDraftContract(2L, 10L, 5L, 3L);
        when(contractRepository.save(any())).thenReturn(savedContract);
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L), anyList())).thenReturn(0L);

        CreateContractDto dto = buildCreateContractDto(3L, 5L, 10L);
        service.create(dto);

        verify(contractRepository).save(argThat(c -> c.getStatus() == ContractStatus.DRAFT));
    }

    @Test
    void create_notifiesOwners_whenPropertyHasOwnerPortalUsers() {
        when(codeGenerationService.generate("CNT")).thenReturn("CNT-003");
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(propertyOwnerPortalRecipientService.portalRecipientUserIds(10L)).thenReturn(List.of(99L));
        when(unitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(tenantRepository.findById(3L)).thenReturn(Optional.of(tenant));

        LeaseContract savedContract = buildDraftContract(3L, 10L, 5L, 3L);
        when(contractRepository.save(any())).thenReturn(savedContract);
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L), anyList())).thenReturn(0L);

        service.create(buildCreateContractDto(3L, 5L, 10L));

        verify(notificationService).createLocalized(
                eq(List.of(99L)), any(), any(), any(), any(), anyString(), anyString(), any(), any());
    }

    // ── ACTIVATE ─────────────────────────────────────────────────────────

    @Test
    void activate_transitionsDraftToActive() {
        LeaseContract draftContract = buildDraftContract(10L, 10L, 5L, 3L);
        when(contractRepository.findById(10L)).thenReturn(Optional.of(draftContract));
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L), anyList())).thenReturn(0L);
        when(contractRepository.save(any())).thenReturn(draftContract);
        when(scheduleRepository.findByContractId(10L)).thenReturn(List.of());
        when(unitRepository.findById(5L)).thenReturn(Optional.of(unit));
        doNothing().when(contractRenewalServiceProvider).ifAvailable(any());
        when(contractRepository.findById(10L)).thenReturn(Optional.of(draftContract));

        service.activate(10L, 1L);

        verify(contractRepository, atLeastOnce()).save(argThat(c -> c.getStatus() == ContractStatus.ACTIVE));
    }

    @Test
    void activate_rejectsNonDraftContract() {
        LeaseContract activeContract = buildContract(11L, 10L, 5L, 3L, ContractStatus.ACTIVE);
        when(contractRepository.findById(11L)).thenReturn(Optional.of(activeContract));

        assertThatThrownBy(() -> service.activate(11L, 1L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Only DRAFT");
    }

    @Test
    void activate_rejectsIfUnitAlreadyHasActiveContract() {
        LeaseContract draftContract = buildDraftContract(12L, 10L, 5L, 3L);
        when(contractRepository.findById(12L)).thenReturn(Optional.of(draftContract));
        // Simulate unit already has a live contract
        when(contractRepository.countByUnitIdAndStatusIn(
                eq(5L),
                argThat(list -> list.contains(ContractStatus.ACTIVE))))
                .thenReturn(1L);

        assertThatThrownBy(() -> service.activate(12L, 1L))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo("UNIT_ALREADY_OCCUPIED");
                });
    }

    // ── CANCEL DRAFT ─────────────────────────────────────────────────────

    @Test
    void cancelDraft_changesDraftToCancelled() {
        LeaseContract draft = buildDraftContract(20L, 10L, 5L, 3L);
        when(contractRepository.findById(20L)).thenReturn(Optional.of(draft));
        when(contractRepository.save(any())).thenReturn(draft);
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L), anyList())).thenReturn(0L);
        when(unitRepository.findById(5L)).thenReturn(Optional.of(unit));
        when(propertyOwnerPortalRecipientService.portalRecipientUserIds(anyLong())).thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        service.cancelDraft(20L, "test reason", 1L);

        verify(contractRepository).save(argThat(c -> c.getStatus() == ContractStatus.CANCELLED));
    }

    @Test
    void cancelDraft_rejectsActiveContract() {
        LeaseContract active = buildContract(21L, 10L, 5L, 3L, ContractStatus.ACTIVE);
        when(contractRepository.findById(21L)).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.cancelDraft(21L, "reason", 1L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Only DRAFT");
    }

    // ── UNIT OCCUPANCY SYNC ───────────────────────────────────────────────

    @Test
    void syncUnit_setsRentedTrue_whenActiveLiveLeaseExists() {
        Unit u = Unit.builder().id(5L).rented(false).reserved(false).build();
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L),
                argThat(list -> list.contains(ContractStatus.ACTIVE)))).thenReturn(1L);
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L),
                argThat(list -> list.contains(ContractStatus.DRAFT)))).thenReturn(0L);
        when(unitRepository.findById(5L)).thenReturn(Optional.of(u));
        when(unitRepository.save(any())).thenReturn(u);

        service.syncUnitRentedFromContracts(5L);

        verify(unitRepository).save(argThat(saved -> saved.isRented() && !saved.isReserved()));
    }

    @Test
    void syncUnit_setsReservedTrue_whenOnlyDraftLeaseExists() {
        Unit u = Unit.builder().id(5L).rented(false).reserved(false).build();
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L),
                argThat(list -> list.contains(ContractStatus.ACTIVE)))).thenReturn(0L);
        when(contractRepository.countByUnitIdAndStatusIn(eq(5L),
                argThat(list -> list.contains(ContractStatus.DRAFT)))).thenReturn(1L);
        when(unitRepository.findById(5L)).thenReturn(Optional.of(u));
        when(unitRepository.save(any())).thenReturn(u);

        service.syncUnitRentedFromContracts(5L);

        verify(unitRepository).save(argThat(saved -> !saved.isRented() && saved.isReserved()));
    }

    @Test
    void syncUnit_clearsBothFlags_whenNoContractsExist() {
        Unit u = Unit.builder().id(5L).rented(true).reserved(true).build();
        when(contractRepository.countByUnitIdAndStatusIn(any(), anyList())).thenReturn(0L);
        when(unitRepository.findById(5L)).thenReturn(Optional.of(u));
        when(unitRepository.save(any())).thenReturn(u);

        service.syncUnitRentedFromContracts(5L);

        verify(unitRepository).save(argThat(saved -> !saved.isRented() && !saved.isReserved()));
    }

    @Test
    void syncUnit_doesNothing_whenUnitIdIsNull() {
        service.syncUnitRentedFromContracts(null);
        verifyNoInteractions(unitRepository);
        verifyNoInteractions(contractRepository);
    }

    // ── GET ALL (scope) ───────────────────────────────────────────────────

    @Test
    void getAll_returnsEmptyPage_whenOwnerHasNoPropertyScope() {
        when(propertyScopeService.propertyIdsOrNullIfUnrestricted()).thenReturn(Collections.emptySet());

        Page<ContractResponse> result = service.getAll(PageRequest.of(0, 10));

        assertThat(result.getContent()).isEmpty();
        verifyNoInteractions(contractRepository);
    }

    @Test
    void getAll_queriesAllContracts_whenNoScopeRestriction() {
        when(propertyScopeService.propertyIdsOrNullIfUnrestricted()).thenReturn(null);
        when(contractRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(buildDraftContract(1L, 10L, 5L, 3L))));

        // Stub fields that toResponse() needs
        when(unitRepository.findById(anyLong())).thenReturn(Optional.of(unit));
        when(tenantRepository.findById(anyLong())).thenReturn(Optional.of(tenant));
        when(propertyRepository.findById(anyLong())).thenReturn(Optional.of(property));

        Page<ContractResponse> result = service.getAll(PageRequest.of(0, 10));

        assertThat(result.getContent()).isNotEmpty();
    }

    // ── HELPERS ──────────────────────────────────────────────────────────

    private LeaseContract buildDraftContract(Long id, Long propId, Long unitId, Long tenantId) {
        return buildContract(id, propId, unitId, tenantId, ContractStatus.DRAFT);
    }

    private LeaseContract buildContract(Long id, Long propId, Long unitId, Long tenantId, ContractStatus status) {
        return LeaseContract.builder()
                .id(id)
                .contractNumber("CNT-" + id)
                .propertyId(propId)
                .unitId(unitId)
                .tenantId(tenantId)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .monthlyRent(BigDecimal.valueOf(400))
                .securityDeposit(BigDecimal.ZERO)
                .currency("OMR")
                .status(status)
                .build();
    }

    private CreateContractDto buildCreateContractDto(Long tenantId, Long unitId, Long propId) {
        CreateContractDto dto = new CreateContractDto();
        dto.setTenantId(tenantId);
        dto.setUnitId(unitId);
        dto.setPropertyId(propId);
        dto.setStartDate(LocalDate.now());
        dto.setEndDate(LocalDate.now().plusYears(1));
        dto.setMonthlyRent(BigDecimal.valueOf(400));
        return dto;
    }

    private void setSecurityContext(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
}
