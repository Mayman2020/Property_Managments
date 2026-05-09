package com.propertymanagement.modules.maintenance;

import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.maintenance.assignment.MaintenanceProvider;
import com.propertymanagement.modules.maintenance.assignment.MaintenanceProviderRepository;
import com.propertymanagement.modules.maintenance.assignment.PropertyMaintenanceAssignment;
import com.propertymanagement.modules.maintenance.assignment.PropertyMaintenanceAssignmentRepository;
import com.propertymanagement.modules.maintenance.category.MaintenanceCategoryRepository;
import com.propertymanagement.modules.inventory.InventoryService;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequest;
import com.propertymanagement.modules.maintenance.request.*;
import com.propertymanagement.modules.maintenance.request.dto.AssignRequestDto;
import com.propertymanagement.modules.maintenance.request.dto.CancelRequestDto;
import com.propertymanagement.modules.maintenance.request.dto.CreateRequestDto;
import com.propertymanagement.modules.maintenance.request.dto.MaintenanceRequestResponse;
import com.propertymanagement.modules.maintenance.visit.VisitReport;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportRequest;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportResponse;
import com.propertymanagement.modules.maintenance.visit.VisitReportItemRepository;
import com.propertymanagement.modules.maintenance.visit.VisitReportRepository;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.owner.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.user.MaintenanceOfficerType;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceRequestServiceTest {

    @Mock MaintenanceRequestRepository requestRepository;
    @Mock VisitReportRepository visitReportRepository;
    @Mock VisitReportItemRepository visitReportItemRepository;
    @Mock NotificationService notificationService;
    @Mock UserRepository userRepository;
    @Mock TenantRepository tenantRepository;
    @Mock PropertyRepository propertyRepository;
    @Mock UnitRepository unitRepository;
    @Mock MaintenanceCategoryRepository categoryRepository;
    @Mock PropertyMaintenanceAssignmentRepository assignmentRepository;
    @Mock CodeGenerationService codeGenerationService;
    @Mock MaintenanceProviderRepository providerRepository;
    @Mock PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    @Mock OwnerPropertyAccessService ownerPropertyAccessService;
    @Mock LocalizedNameResolver localizedNameResolver;
    @Mock InventoryService inventoryService;

    @InjectMocks MaintenanceRequestService service;

    private User adminUser;
    private Property property;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        setSecurityContext(adminUser);
        property = Property.builder()
                .id(10L).active(true)
                .propertyName("Test Prop")
                .build();
    }

    // ── CREATE ────────────────────────────────────────────────────────────

    @Test
    void create_savesPendingRequest_whenNoAssignmentConfigured() {
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(codeGenerationService.generate("MR")).thenReturn("MR-001");
        when(assignmentRepository.findActivePrimaryByPropertyId(10L)).thenReturn(Optional.empty());

        MaintenanceRequest savedReq = buildRequest(1L, RequestStatus.PENDING, null, null);
        when(requestRepository.save(any())).thenReturn(savedReq);

        CreateRequestDto dto = buildCreateDto(10L);
        MaintenanceRequestResponse result = service.create(dto);

        assertThat(result).isNotNull();
        verify(requestRepository).save(argThat(r -> r.getStatus() == RequestStatus.PENDING));
    }

    @Test
    void create_assignsInternalOfficer_whenAssignmentTableHasInternalUser() {
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(codeGenerationService.generate("MR")).thenReturn("MR-002");

        PropertyMaintenanceAssignment assignment = PropertyMaintenanceAssignment.builder()
                .id(1L).propertyId(10L).maintenanceProviderId(5L).build();
        when(assignmentRepository.findActivePrimaryByPropertyId(10L)).thenReturn(Optional.of(assignment));

        MaintenanceProvider provider = MaintenanceProvider.builder()
                .id(5L).providerType("USER").userId(99L).build();
        when(providerRepository.findById(5L)).thenReturn(Optional.of(provider));

        MaintenanceRequest savedReq = buildRequest(2L, RequestStatus.ASSIGNED, 99L, null);
        when(requestRepository.save(any())).thenReturn(savedReq);

        MaintenanceRequestResponse result = service.create(buildCreateDto(10L));

        verify(requestRepository).save(argThat(r ->
                r.getStatus() == RequestStatus.ASSIGNED && Long.valueOf(99L).equals(r.getAssignedTo())));
    }

    @Test
    void create_routesToContractorQueue_whenAssignmentTableHasCompanyWithNoAutoAssignee() {
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(codeGenerationService.generate("MR")).thenReturn("MR-003");

        PropertyMaintenanceAssignment assignment = PropertyMaintenanceAssignment.builder()
                .id(1L).propertyId(10L).maintenanceProviderId(7L).build();
        when(assignmentRepository.findActivePrimaryByPropertyId(10L)).thenReturn(Optional.of(assignment));

        MaintenanceProvider provider = MaintenanceProvider.builder()
                .id(7L).providerType("COMPANY").companyId(55L).build();
        when(providerRepository.findById(7L)).thenReturn(Optional.of(provider));
        // No staff linked to company at this property = auto-assignee is null (multiple or zero)
        when(userRepository.findActiveContractorStaffForProperty(10L, 55L))
                .thenReturn(List.of()); // empty → no auto-assignee

        MaintenanceRequest savedReq = buildRequest(3L, RequestStatus.PENDING, null, 55L);
        when(requestRepository.save(any())).thenReturn(savedReq);

        service.create(buildCreateDto(10L));

        verify(requestRepository).save(argThat(r ->
                r.getStatus() == RequestStatus.PENDING
                && r.getAssignedTo() == null
                && Long.valueOf(55L).equals(r.getContractorCompanyId())));
    }

    @Test
    void create_throwsNotFound_whenPropertyInactive() {
        Property inactive = Property.builder().id(10L).active(false).build();
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> service.create(buildCreateDto(10L)))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Property not found");
    }

    // ── ASSIGN ────────────────────────────────────────────────────────────

    @Test
    void assign_transitionsPendingToAssigned() {
        MaintenanceRequest req = buildRequest(10L, RequestStatus.PENDING, null, null);
        when(requestRepository.findById(10L)).thenReturn(Optional.of(req));

        User officer = User.builder().id(50L).role(UserRole.MAINTENANCE_OFFICER_INTERNAL)
                .maintenanceOfficerType(MaintenanceOfficerType.INTERNAL_PROPERTY).build();
        when(userRepository.findById(50L)).thenReturn(Optional.of(officer));

        MaintenanceRequest saved = buildRequest(10L, RequestStatus.ASSIGNED, 50L, null);
        when(requestRepository.save(any())).thenReturn(saved);

        AssignRequestDto dto = new AssignRequestDto();
        dto.setOfficerId(50L);

        service.assign(10L, dto);

        verify(requestRepository).save(argThat(r ->
                r.getStatus() == RequestStatus.ASSIGNED
                && Long.valueOf(50L).equals(r.getAssignedTo())));
    }

    @Test
    void assign_throwsBadRequest_whenRequestAlreadyAssigned() {
        MaintenanceRequest req = buildRequest(11L, RequestStatus.ASSIGNED, 50L, null);
        when(requestRepository.findById(11L)).thenReturn(Optional.of(req));

        AssignRequestDto dto = new AssignRequestDto();
        dto.setOfficerId(60L);

        assertThatThrownBy(() -> service.assign(11L, dto))
                .isInstanceOf(AppException.class);
    }

    @Test
    void assign_throwsForbidden_whenCallerIsOwner() {
        User ownerUser = User.builder().id(2L).role(UserRole.OWNER).build();
        setSecurityContext(ownerUser);
        doThrow(AppException.forbidden("Owners cannot assign maintenance staff"))
                .when(ownerPropertyAccessService).denyOwnerMutation(anyString());

        assertThatThrownBy(() -> service.assign(10L, new AssignRequestDto()))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Owners cannot assign");
    }

    // ── INVALID STATUS TRANSITIONS ─────────────────────────────────────────

    @Test
    void statusTransition_pendingToInProgress_isNotDirectlyAllowed() {
        // PENDING → IN_PROGRESS skips ASSIGNED and SCHEDULED — should throw
        MaintenanceRequest req = buildRequest(20L, RequestStatus.PENDING, null, null);
        when(requestRepository.findById(20L)).thenReturn(Optional.of(req));

        // startWork() validates SCHEDULED → IN_PROGRESS
        assertThatThrownBy(() -> service.startWork(20L))
                .isInstanceOf(AppException.class);
    }

    @Test
    void statusTransition_completedToCancelled_isNotAllowed() {
        MaintenanceRequest req = buildRequest(21L, RequestStatus.COMPLETED, 50L, null);
        when(requestRepository.findById(21L)).thenReturn(Optional.of(req));

        CancelRequestDto cancelDto = new CancelRequestDto();
        cancelDto.setReason("reason");
        assertThatThrownBy(() -> service.cancel(21L, cancelDto))
                .isInstanceOf(AppException.class);
    }

    // ── SUBMIT VISIT REPORT ───────────────────────────────────────────────

    @Test
    void submitVisitReport_deductsInventoryForEachConsumedItem() {
        MaintenanceRequest req = buildRequest(30L, RequestStatus.IN_PROGRESS, 1L, null);
        when(requestRepository.findById(30L)).thenReturn(Optional.of(req));
        when(visitReportRepository.existsByRequestId(30L)).thenReturn(false);

        VisitReport savedReport = VisitReport.builder().id(100L).requestId(30L)
                .officerId(1L).visitOutcome("COMPLETED").build();
        when(visitReportRepository.save(any())).thenReturn(savedReport);
        when(requestRepository.save(any())).thenReturn(req);

        VisitReportRequest dto = new VisitReportRequest();
        dto.setVisitDate(java.time.LocalDate.now());
        dto.setVisitOutcome("COMPLETED");
        VisitReportRequest.VisitReportItemDto item1 = new VisitReportRequest.VisitReportItemDto();
        item1.setItemId(10L);
        item1.setQuantityUsed(java.math.BigDecimal.valueOf(2));
        VisitReportRequest.VisitReportItemDto item2 = new VisitReportRequest.VisitReportItemDto();
        item2.setItemId(11L);
        item2.setQuantityUsed(java.math.BigDecimal.valueOf(1));
        dto.setItems(List.of(item1, item2));

        service.submitVisitReport(30L, dto);

        verify(inventoryService, times(2)).adjustStock(anyLong(), argThat(s ->
                "OUT".equals(s.getType()) && s.getRequestId().equals(30L)));
        verify(inventoryService).adjustStock(eq(10L), argThat(s ->
                s.getQuantity().compareTo(java.math.BigDecimal.valueOf(2)) == 0));
        verify(inventoryService).adjustStock(eq(11L), argThat(s ->
                s.getQuantity().compareTo(java.math.BigDecimal.valueOf(1)) == 0));
    }

    @Test
    void submitVisitReport_doesNotCallInventory_whenNoItemsProvided() {
        MaintenanceRequest req = buildRequest(31L, RequestStatus.IN_PROGRESS, 1L, null);
        when(requestRepository.findById(31L)).thenReturn(Optional.of(req));
        when(visitReportRepository.existsByRequestId(31L)).thenReturn(false);

        VisitReport savedReport = VisitReport.builder().id(101L).requestId(31L)
                .officerId(1L).visitOutcome("COMPLETED").build();
        when(visitReportRepository.save(any())).thenReturn(savedReport);
        when(requestRepository.save(any())).thenReturn(req);

        VisitReportRequest dto = new VisitReportRequest();
        dto.setVisitDate(java.time.LocalDate.now());
        dto.setVisitOutcome("COMPLETED");
        dto.setItems(null);

        service.submitVisitReport(31L, dto);

        verifyNoInteractions(inventoryService);
    }

    // ── GET COMPANY QUEUE ─────────────────────────────────────────────────

    @Test
    void getCompanyQueueForOfficer_returnsEmpty_whenUserIsNotContractorStaff() {
        User internalOfficer = User.builder()
                .id(50L).role(UserRole.MAINTENANCE_OFFICER_INTERNAL)
                .maintenanceOfficerType(MaintenanceOfficerType.INTERNAL_PROPERTY)
                .build();

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<MaintenanceRequestResponse> result =
                service.getCompanyQueueForOfficer(internalOfficer, pageable);

        assertThat(result.getContent()).isEmpty();
    }

    // ── HELPERS ──────────────────────────────────────────────────────────

    private MaintenanceRequest buildRequest(Long id, RequestStatus status, Long assignedTo, Long companyId) {
        return MaintenanceRequest.builder()
                .id(id)
                .requestNumber("MR-" + id)
                .propertyId(10L)
                .title("Test request")
                .description("Test description")
                .priority(RequestPriority.NORMAL)
                .status(status)
                .assignedTo(assignedTo)
                .contractorCompanyId(companyId)
                .build();
    }

    private CreateRequestDto buildCreateDto(Long propertyId) {
        CreateRequestDto dto = new CreateRequestDto();
        dto.setPropertyId(propertyId);
        dto.setTitle("Broken pipe");
        dto.setDescription("Water leak in bathroom");
        dto.setPriority(RequestPriority.HIGH);
        dto.setCategoryIds(List.of(1L));
        dto.setUnitId(5L);
        return dto;
    }

    private void setSecurityContext(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null,
                        user.getAuthorities() != null ? user.getAuthorities() : java.util.List.of()));
    }
}
