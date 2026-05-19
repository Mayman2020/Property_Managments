package com.propertymanagement.modules.maintenance.request.service;

import com.propertymanagement.modules.inventory.service.InventoryService;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequestDTO;
import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceProvider;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceProviderRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.PropertyMaintenanceAssignmentRepository;
import com.propertymanagement.modules.maintenance.category.repository.MaintenanceCategoryRepository;
import com.propertymanagement.modules.maintenance.invoice.entity.MaintenanceInvoice;
import com.propertymanagement.modules.maintenance.invoice.repository.MaintenanceInvoiceRepository;
import com.propertymanagement.modules.maintenance.request.dto.*;
import com.propertymanagement.modules.maintenance.visit.entity.VisitReport;
import com.propertymanagement.modules.maintenance.visit.entity.VisitReportItem;
import com.propertymanagement.modules.maintenance.visit.repository.VisitReportItemRepository;
import com.propertymanagement.modules.maintenance.visit.repository.VisitReportRepository;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportRequest;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportResponse;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import lombok.RequiredArgsConstructor;
import com.propertymanagement.codegen.CodeGenerationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.owner.entity.Owner;

@Service
@RequiredArgsConstructor
public class MaintenanceRequestService {

    private final MaintenanceRequestRepository requestRepository;
    private final VisitReportRepository visitReportRepository;
    private final VisitReportItemRepository visitReportItemRepository;
    private final MaintenanceInvoiceRepository maintenanceInvoiceRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final MaintenanceCategoryRepository categoryRepository;
    private final PropertyMaintenanceAssignmentRepository assignmentRepository;
    private final CodeGenerationService codeGenerationService;
    private final MaintenanceProviderRepository providerRepository;
    private final MaintenanceContractRepository maintenanceContractRepository;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;
    private final InventoryService inventoryService;
    private final ContractorCompanyRepository contractorCompanyRepository;

    public Page<MaintenanceRequestResponse> getAll(Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            return requestRepository.findByPropertyIdIn(ownerScope, pageable).map(this::toResponse);
        }
        return requestRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getAll(RequestStatus status, RequestPriority priority, Long propertyId, Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            if (propertyId != null) {
                ownerPropertyAccessService.assertOwnerCanAccessProperty(propertyId);
                return requestRepository.findFiltered(status, priority, propertyId, pageable).map(this::toResponse);
            }
            return requestRepository.findFilteredForPropertyIds(status, priority, ownerScope, pageable).map(this::toResponse);
        }
        return requestRepository.findFiltered(status, priority, propertyId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByProperty(Long propertyId, Pageable pageable) {
        ownerPropertyAccessService.assertOwnerCanAccessProperty(propertyId);
        return requestRepository.findByPropertyId(propertyId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByTenant(Long tenantId, Pageable pageable) {
        return requestRepository.findByTenantId(tenantId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByTenantSecured(Long tenantId, Pageable pageable) {
        User user = requireUser();
        if (user.getRole() == UserRole.TENANT) {
            Long ownTenantId = tenantRepository.findByUserId(user.getId())
                    .map(Tenant::getId)
                    .orElseThrow(() -> AppException.forbidden("Tenant profile is not linked to this account"));
            if (!ownTenantId.equals(tenantId)) {
                throw AppException.forbidden("Access denied");
            }
        } else if (user.getRole() != UserRole.SUPER_ADMIN && user.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Access denied");
        }
        return getByTenant(tenantId, pageable);
    }

    public Page<MaintenanceRequestResponse> getByOfficer(Long officerId, Pageable pageable) {
        return requestRepository.findByAssignedTo(officerId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByOfficerSecured(Long officerId, Long propertyId, Pageable pageable) {
        assertOfficerScope(officerId);
        if (propertyId != null) {
            assertCurrentContractorProperty(propertyId);
            return requestRepository.findByAssignedToAndPropertyId(officerId, propertyId, pageable).map(this::toResponse);
        }
        return getByOfficer(officerId, pageable);
    }

    public long countOpenAssignedToOfficerSecured(Long officerId) {
        assertOfficerScope(officerId);
        return requestRepository.countOpenAssignedToOfficer(officerId);
    }

    private void assertOfficerScope(Long officerId) {
        User user = requireUser();
        if (UserRole.isMaintenanceStaff(user.getRole())) {
            if (!user.getId().equals(officerId)) {
                throw AppException.forbidden("Access denied");
            }
        } else if (user.getRole() != UserRole.SUPER_ADMIN && user.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Access denied");
        }
    }

    public Page<MaintenanceRequestResponse> getByStatus(RequestStatus status, Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            return requestRepository.findByStatusAndPropertyIdIn(status, ownerScope, pageable).map(this::toResponse);
        }
        return requestRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    public MaintenanceRequestResponse getById(Long id) {
        MaintenanceRequest request = find(id);
        assertCanView(request);
        return toResponse(request);
    }

    private void assertCanView(MaintenanceRequest request) {
        User user = requireUser();
        switch (user.getRole()) {
            case SUPER_ADMIN -> { /* ok */ }
            case GENERAL_MANAGER -> {
                if (user.getPropertyId() != null && !user.getPropertyId().equals(request.getPropertyId())) {
                    throw AppException.forbidden("Access denied");
                }
            }
            case TENANT -> {
                tenantRepository.findByUserId(user.getId())
                        .filter(t -> t.getId().equals(request.getTenantId()))
                        .orElseThrow(() -> AppException.forbidden("Access denied"));
            }
            case MAINTENANCE_OFFICER_INTERNAL,
                 MAINTENANCE_OFFICER_COMPANY,
                 MAINTENANCE_COMPANY -> {
                if (request.getAssignedTo() != null && request.getAssignedTo().equals(user.getId())) {
                    return;
                }
                if (isContractorCompanyQueueVisible(user, request)) {
                    return;
                }
                throw AppException.forbidden("Access denied");
            }
            case ACCOUNTANT -> { /* org-wide read */ }
            case PROPERTY_GUARD -> {
                if (user.getPropertyId() != null && !user.getPropertyId().equals(request.getPropertyId())) {
                    throw AppException.forbidden("Access denied");
                }
            }
            case OWNER -> ownerPropertyAccessService.assertOwnerCanAccessProperty(request.getPropertyId());
            default -> throw AppException.forbidden("Access denied");
        }
    }

    private User requireUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    public PropertyRoutingInfoDto getRoutingInfo(Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .filter(Property::isActive)
                .orElseThrow(() -> AppException.notFound("Property not found: " + propertyId));

        var activeAssignment = assignmentRepository.findActivePrimaryByPropertyId(property.getId());
        if (activeAssignment.isPresent()) {
            MaintenanceProvider provider = providerRepository
                    .findById(activeAssignment.get().getMaintenanceProviderId()).orElse(null);
            if (provider != null) {
                if ("USER".equals(provider.getProviderType()) && provider.getUserId() != null) {
                    String name = userRepository.findById(provider.getUserId())
                            .map(u -> u.getFullName() != null ? u.getFullName() : u.getFullNameEn())
                            .orElse(null);
                    return PropertyRoutingInfoDto.builder()
                            .hasOfficer(true).hasCompany(false)
                            .officerUserId(provider.getUserId()).officerName(name)
                            .build();
                } else if ("COMPANY".equals(provider.getProviderType()) && provider.getCompanyId() != null) {
                    ContractorCompanyEntity company = contractorCompanyRepository.findById(provider.getCompanyId()).orElse(null);
                    return PropertyRoutingInfoDto.builder()
                            .hasOfficer(false).hasCompany(true)
                            .companyId(provider.getCompanyId())
                            .companyNameAr(company != null ? company.getNameAr() : null)
                            .companyNameEn(company != null ? company.getNameEn() : null)
                            .build();
                }
            }
        }

        // Fallback: legacy property columns — may have both set
        Long internalOfficerId = property.getMaintenanceInternalOfficerUserId();
        Long propCompanyId = property.getMaintenanceContractorCompanyId();
        String officerName = null;
        if (internalOfficerId != null) {
            officerName = userRepository.findById(internalOfficerId)
                    .map(u -> u.getFullName() != null ? u.getFullName() : u.getFullNameEn()).orElse(null);
        }
        ContractorCompanyEntity companyEntity = propCompanyId != null
                ? contractorCompanyRepository.findById(propCompanyId).orElse(null)
                : null;

        return PropertyRoutingInfoDto.builder()
                .hasOfficer(internalOfficerId != null)
                .hasCompany(propCompanyId != null)
                .officerUserId(internalOfficerId)
                .officerName(officerName)
                .companyId(propCompanyId)
                .companyNameAr(companyEntity != null ? companyEntity.getNameAr() : null)
                .companyNameEn(companyEntity != null ? companyEntity.getNameEn() : null)
                .build();
    }

    @Transactional
    public MaintenanceRequestResponse create(CreateRequestDto dto) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot create maintenance requests from the admin console");
        Property property = propertyRepository.findById(dto.getPropertyId())
                .filter(Property::isActive)
                .orElseThrow(() -> AppException.notFound("Property not found: " + dto.getPropertyId()));

        String requestNumber = codeGenerationService.generate("MR");
        MaintenanceRequest.MaintenanceRequestBuilder builder = MaintenanceRequest.builder()
                .requestNumber(requestNumber)
                .propertyId(dto.getPropertyId())
                .unitId(dto.getUnitId())
                .tenantId(dto.getTenantId())
                .categoryId(dto.getResolvedCategoryId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .priority(dto.getPriority() != null ? dto.getPriority() : RequestPriority.NORMAL)
                .tenantNotes(dto.getTenantNotes());

        Long resolvedOfficerId = null;

        // ── Routing: new assignment table takes priority over legacy property columns ──
        boolean routed = false;
        var activeAssignment = assignmentRepository.findActivePrimaryByPropertyId(property.getId());
        if (activeAssignment.isPresent()) {
            MaintenanceProvider provider = providerRepository
                    .findById(activeAssignment.get().getMaintenanceProviderId()).orElse(null);
            if (provider != null) {
                if ("USER".equals(provider.getProviderType()) && provider.getUserId() != null) {
                    builder.assignedTo(provider.getUserId())
                            .status(RequestStatus.ASSIGNED)
                            .contractorCompanyId(null);
                    routed = true;
                } else if ("COMPANY".equals(provider.getProviderType()) && provider.getCompanyId() != null) {
                    Long autoAssignee = resolveContractorAutoAssignee(provider.getCompanyId(), property.getId());
                    if (autoAssignee != null) {
                        builder.status(RequestStatus.ASSIGNED)
                                .assignedTo(autoAssignee)
                                .contractorCompanyId(provider.getCompanyId());
                        resolvedOfficerId = autoAssignee;
                    } else {
                        builder.status(RequestStatus.PENDING)
                                .assignedTo(null)
                                .contractorCompanyId(provider.getCompanyId());
                    }
                    routed = true;
                }
            }
        }

        // ── Fallback: legacy direct FK columns on the property ──
        if (!routed) {
            Long internalOfficerId = property.getMaintenanceInternalOfficerUserId();
            Long propCompanyId = property.getMaintenanceContractorCompanyId();
            String target = dto.getRoutingTarget(); // "OFFICER" | "COMPANY" | null
            boolean preferOfficer = internalOfficerId != null && (!"COMPANY".equals(target));
            boolean preferCompany = propCompanyId != null && (!"OFFICER".equals(target));
            if (preferOfficer && internalOfficerId != null) {
                assertInternalOfficerForProperty(internalOfficerId, property.getId());
                builder.assignedTo(internalOfficerId)
                        .status(RequestStatus.ASSIGNED)
                        .contractorCompanyId(null);
                resolvedOfficerId = internalOfficerId;
            } else if (preferCompany && propCompanyId != null) {
                Long autoAssignee = resolveContractorAutoAssignee(propCompanyId, property.getId());
                if (autoAssignee != null) {
                    builder.status(RequestStatus.ASSIGNED)
                            .assignedTo(autoAssignee)
                            .contractorCompanyId(propCompanyId);
                    resolvedOfficerId = autoAssignee;
                } else {
                    builder.status(RequestStatus.PENDING)
                            .assignedTo(null)
                            .contractorCompanyId(propCompanyId);
                }
            } else {
                builder.status(RequestStatus.PENDING)
                        .assignedTo(null)
                        .contractorCompanyId(null);
            }
        }

        MaintenanceRequest saved = requestRepository.save(builder.build());
        notifyRequestCreated(saved);
        if (resolvedOfficerId != null) {
            notifyRequestAssigned(saved);
        }
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse assign(Long id, AssignRequestDto dto) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot assign maintenance staff");
        MaintenanceRequest request = find(id);
        validateTransition(request.getStatus(), RequestStatus.ASSIGNED);
        User caller = requireUser();
        assertCanAssignRequest(caller, request);
        User officer = userRepository.findById(dto.getOfficerId())
                .orElseThrow(() -> AppException.badRequest("Officer not found: " + dto.getOfficerId()));
        assertAssignableOfficer(officer, request);
        request.setAssignedTo(dto.getOfficerId());
        request.setStatus(RequestStatus.ASSIGNED);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyRequestAssigned(saved);
        return toResponse(saved);
    }

    public Page<MaintenanceRequestResponse> getCompanyQueueForOfficer(User officer, Long propertyId, Pageable pageable) {
        boolean contractorStaff = officer.getContractorCompanyId() != null
                && (officer.getRole() == UserRole.MAINTENANCE_COMPANY
                    || (officer.getRole() == UserRole.MAINTENANCE_OFFICER_COMPANY
                        && officer.getMaintenanceOfficerType() == MaintenanceOfficerType.CONTRACTOR_COMPANY));
        if (!contractorStaff) {
            return Page.empty(pageable);
        }
        List<Long> activePropertyIds = activeContractPropertyIdsForCompany(officer.getContractorCompanyId());
        if (activePropertyIds.isEmpty()) {
            return Page.empty(pageable);
        }
        if (propertyId != null) {
            if (!activePropertyIds.contains(propertyId)) {
                throw AppException.forbidden("Access denied");
            }
            return requestRepository.findByContractorCompanyIdAndPropertyIdAndAssignedToIsNullAndStatusOrderByCreatedAtDesc(
                    officer.getContractorCompanyId(),
                    propertyId,
                    RequestStatus.PENDING,
                    pageable
            ).map(this::toResponse);
        }
        return requestRepository.findByContractorCompanyIdAndPropertyIdAndAssignedToIsNullAndStatusOrderByCreatedAtDesc(
                officer.getContractorCompanyId(),
                activePropertyIds.get(0),
                RequestStatus.PENDING,
                pageable
        ).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getCompanyQueueForOfficer(User officer, Pageable pageable) {
        return getCompanyQueueForOfficer(officer, null, pageable);
    }

    public Page<MaintenanceRequestResponse> getCompanyQueueForCurrentOfficer(Long propertyId, Pageable pageable) {
        User officer = requireUser();
        if (propertyId == null) {
            List<Long> activePropertyIds = activeContractPropertyIdsForCompany(officer.getContractorCompanyId());
            if (activePropertyIds.size() > 1) {
                return requestRepository.findByContractorCompanyIdAndAssignedToIsNullAndStatusAndPropertyIdInOrderByCreatedAtDesc(
                        officer.getContractorCompanyId(),
                        RequestStatus.PENDING,
                        activePropertyIds,
                        pageable
                ).map(this::toResponse);
            }
        }
        return getCompanyQueueForOfficer(officer, propertyId, pageable);
    }

    @Transactional
    public MaintenanceRequestResponse schedule(Long id, ScheduleRequestDto dto) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot schedule maintenance visits");
        MaintenanceRequest request = find(id);
        validateTransition(request.getStatus(), RequestStatus.SCHEDULED);
        request.setScheduledDate(dto.getScheduledDate());
        request.setScheduledTimeFrom(dto.getScheduledTimeFrom());
        request.setScheduledTimeTo(dto.getScheduledTimeTo());
        request.setStatus(RequestStatus.SCHEDULED);
        request.setScheduleAccepted(null);
        request.setScheduleRejectionNote(null);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyRequestScheduled(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse acceptSchedule(Long id) {
        MaintenanceRequest request = find(id);
        if (request.getStatus() != RequestStatus.SCHEDULED) {
            throw AppException.badRequest("Request must be in SCHEDULED status to accept schedule");
        }
        request.setScheduleAccepted(true);
        request.setScheduleRejectionNote(null);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyScheduleAccepted(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse rejectSchedule(Long id, RejectScheduleDto dto) {
        MaintenanceRequest request = find(id);
        if (request.getStatus() != RequestStatus.SCHEDULED) {
            throw AppException.badRequest("Request must be in SCHEDULED status to reject schedule");
        }
        request.setScheduleAccepted(false);
        request.setScheduleRejectionNote(dto.getRejectionNote());
        request.setStatus(RequestStatus.ASSIGNED);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyScheduleRejected(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse startWork(Long id) {
        MaintenanceRequest request = find(id);
        validateTransition(request.getStatus(), RequestStatus.IN_PROGRESS);
        request.setStatus(RequestStatus.IN_PROGRESS);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyWorkStarted(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse cancel(Long id, CancelRequestDto dto) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot cancel maintenance requests from this screen");
        MaintenanceRequest request = find(id);
        if (EnumSet.of(RequestStatus.COMPLETED, RequestStatus.CANCELLED).contains(request.getStatus())) {
            throw AppException.badRequest("Cannot cancel a request in status: " + request.getStatus());
        }
        request.setStatus(RequestStatus.CANCELLED);
        request.setClosedAt(LocalDateTime.now());
        if (dto.getReason() != null) {
            request.setTenantNotes(dto.getReason());
        }
        notifyRequestCancelled(request);
        return toResponse(requestRepository.save(request));
    }

    @Transactional
    public VisitReportResponse submitVisitReport(Long id, VisitReportRequest dto) {
        MaintenanceRequest request = find(id);
        if (request.getStatus() != RequestStatus.IN_PROGRESS) {
            throw AppException.badRequest("Visit report can only be submitted for IN_PROGRESS requests");
        }
        if (visitReportRepository.existsByRequestId(id)) {
            throw AppException.conflict("Visit report already submitted for request: " + id);
        }

        VisitReport report = VisitReport.builder()
                .requestId(id)
                .officerId(currentUserId())
                .visitDate(dto.getVisitDate() != null ? dto.getVisitDate() : LocalDate.now())
                .visitOutcome(dto.getVisitOutcome())
                .officerNotes(dto.getOfficerNotes())
                .workDone(dto.getWorkDone())
                .hasPurchase(dto.isHasPurchase())
                .purchaseAmount(dto.getPurchaseAmount())
                .purchaseNotes(dto.getPurchaseNotes())
                .receiptUrl(dto.getReceiptUrl())
                .build();
        VisitReport saved = visitReportRepository.save(report);
        createCompanyInvoiceFromVisitPurchase(request, saved);

        if (dto.getItems() != null) {
            for (VisitReportRequest.VisitReportItemDto itemDto : dto.getItems()) {
                VisitReportItem item = VisitReportItem.builder()
                        .visitReportId(saved.getId())
                        .itemId(itemDto.getItemId())
                        .quantityUsed(itemDto.getQuantityUsed())
                        .notes(itemDto.getNotes())
                        .build();
                visitReportItemRepository.save(item);

                StockTransactionRequestDTO stock = new StockTransactionRequestDTO();
                stock.setType("OUT");
                stock.setQuantity(itemDto.getQuantityUsed());
                stock.setNotes("Maintenance request: " + request.getRequestNumber());
                stock.setRequestId(id);
                inventoryService.adjustStock(itemDto.getItemId(), stock);
            }
        }

        RequestStatus finalStatus = resolveOutcomeStatus(dto.getVisitOutcome());
        request.setStatus(finalStatus);
        if (EnumSet.of(RequestStatus.COMPLETED, RequestStatus.CANCELLED, RequestStatus.TENANT_ABSENT)
                .contains(finalStatus)) {
            request.setClosedAt(LocalDateTime.now());
        }
        requestRepository.save(request);
        notifyVisitReported(request);
        return toVisitResponse(saved);
    }

    private void createCompanyInvoiceFromVisitPurchase(MaintenanceRequest request, VisitReport report) {
        if (!report.isHasPurchase()) {
            return;
        }
        if (request.getContractorCompanyId() == null) {
            return;
        }
        if (report.getPurchaseAmount() == null || report.getPurchaseAmount().signum() <= 0) {
            throw AppException.badRequest("Purchase amount is required when receipt invoice is attached");
        }
        if (report.getReceiptUrl() == null || report.getReceiptUrl().isBlank()) {
            throw AppException.badRequest("Receipt attachment is required when purchase is recorded");
        }
        LocalDate invoiceDate = report.getVisitDate() != null ? report.getVisitDate() : LocalDate.now();
        maintenanceInvoiceRepository.save(MaintenanceInvoice.builder()
                .invoiceNumber(codeGenerationService.generate("INV"))
                .contractorCompanyId(request.getContractorCompanyId())
                .propertyId(request.getPropertyId())
                .unitId(request.getUnitId())
                .periodMonth(invoiceDate.getMonthValue())
                .periodYear(invoiceDate.getYear())
                .amount(report.getPurchaseAmount())
                .description(visitPurchaseInvoiceDescription(request, report))
                .fileUrl(report.getReceiptUrl().trim())
                .notes(report.getPurchaseNotes())
                .submittedBy(report.getOfficerId())
                .status("PENDING")
                .build());
    }

    private String visitPurchaseInvoiceDescription(MaintenanceRequest request, VisitReport report) {
        String base = "فاتورة مشتريات صيانة للطلب " + request.getRequestNumber();
        if (report.getPurchaseNotes() == null || report.getPurchaseNotes().isBlank()) {
            return base;
        }
        return base + " - " + report.getPurchaseNotes().trim();
    }

    public VisitReportResponse getVisitReport(Long requestId) {
        MaintenanceRequest request = find(requestId);
        assertCanView(request);
        return visitReportRepository.findByRequestId(requestId)
                .map(this::toVisitResponse)
                .orElseThrow(() -> AppException.notFound("Visit report not found for request: " + requestId));
    }

    private RequestStatus resolveOutcomeStatus(String outcome) {
        if (outcome == null) return RequestStatus.COMPLETED;
        return switch (outcome.toUpperCase()) {
            case "COMPLETED" -> RequestStatus.COMPLETED;
            case "TENANT_ABSENT" -> RequestStatus.TENANT_ABSENT;
            case "NEEDS_REVISIT" -> RequestStatus.NEEDS_REVISIT;
            case "NEEDS_PARTS" -> RequestStatus.IN_PROGRESS;
            case "CANCELLED_BY_TENANT" -> RequestStatus.CANCELLED;
            default -> RequestStatus.COMPLETED;
        };
    }

    private void validateTransition(RequestStatus current, RequestStatus next) {
        boolean valid = switch (next) {
            case ASSIGNED -> current == RequestStatus.PENDING;
            case SCHEDULED -> current == RequestStatus.ASSIGNED || current == RequestStatus.NEEDS_REVISIT;
            case IN_PROGRESS -> current == RequestStatus.SCHEDULED;
            default -> false;
        };
        if (!valid) {
            throw AppException.badRequest(
                    "Invalid status transition from " + current + " to " + next);
        }
    }

    /**
     * Creates a maintenance request from a complaint. Owners, admins, and accountants may call this.
     * Sets priority to URGENT and marks the request as complaint-originated.
     * Notifications are sent with a red-tint color hint so recipients know the source.
     */
    @Transactional
    public MaintenanceRequestResponse createFromComplaint(
            com.propertymanagement.modules.maintenance.request.dto.CreateRequestDto dto,
            Long complaintId) {
        Property property = propertyRepository.findById(dto.getPropertyId())
                .filter(Property::isActive)
                .orElseThrow(() -> AppException.notFound("Property not found: " + dto.getPropertyId()));

        String requestNumber = codeGenerationService.generate("MR");
        MaintenanceRequest.MaintenanceRequestBuilder builder = MaintenanceRequest.builder()
                .requestNumber(requestNumber)
                .propertyId(dto.getPropertyId())
                .unitId(dto.getUnitId())
                .tenantId(dto.getTenantId())
                .categoryId(dto.getResolvedCategoryId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .priority(RequestPriority.URGENT)
                .tenantNotes(dto.getTenantNotes())
                .complaintId(complaintId)
                .fromComplaint(true);

        Long resolvedOfficerId = null;
        boolean routed = false;
        var activeAssignment = assignmentRepository.findActivePrimaryByPropertyId(property.getId());
        if (activeAssignment.isPresent()) {
            MaintenanceProvider provider = providerRepository
                    .findById(activeAssignment.get().getMaintenanceProviderId()).orElse(null);
            if (provider != null) {
                if ("USER".equals(provider.getProviderType()) && provider.getUserId() != null) {
                    builder.assignedTo(provider.getUserId()).status(RequestStatus.ASSIGNED).contractorCompanyId(null);
                    routed = true;
                } else if ("COMPANY".equals(provider.getProviderType()) && provider.getCompanyId() != null) {
                    Long autoAssignee = resolveContractorAutoAssignee(provider.getCompanyId(), property.getId());
                    if (autoAssignee != null) {
                        builder.status(RequestStatus.ASSIGNED).assignedTo(autoAssignee).contractorCompanyId(provider.getCompanyId());
                        resolvedOfficerId = autoAssignee;
                    } else {
                        builder.status(RequestStatus.PENDING).assignedTo(null).contractorCompanyId(provider.getCompanyId());
                    }
                    routed = true;
                }
            }
        }
        if (!routed) {
            Long internalOfficerId = property.getMaintenanceInternalOfficerUserId();
            Long propCompanyId = property.getMaintenanceContractorCompanyId();
            if (internalOfficerId != null) {
                assertInternalOfficerForProperty(internalOfficerId, property.getId());
                builder.assignedTo(internalOfficerId).status(RequestStatus.ASSIGNED).contractorCompanyId(null);
                resolvedOfficerId = internalOfficerId;
            } else if (propCompanyId != null) {
                Long autoAssignee = resolveContractorAutoAssignee(propCompanyId, property.getId());
                if (autoAssignee != null) {
                    builder.status(RequestStatus.ASSIGNED).assignedTo(autoAssignee).contractorCompanyId(propCompanyId);
                    resolvedOfficerId = autoAssignee;
                } else {
                    builder.status(RequestStatus.PENDING).assignedTo(null).contractorCompanyId(propCompanyId);
                }
            } else {
                builder.status(RequestStatus.PENDING).assignedTo(null).contractorCompanyId(null);
            }
        }

        MaintenanceRequest saved = requestRepository.save(builder.build());
        notifyRequestCreatedFromComplaint(saved);
        if (resolvedOfficerId != null) {
            notifyRequestAssigned(saved);
        }
        return toResponse(saved);
    }

    private String generateRequestNumber() {
        return codeGenerationService.generate("MR");
    }

    private Long currentUserId() {
        return requireUser().getId();
    }

    private void notifyRequestCreatedFromComplaint(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyAccountantIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        // color = light red so recipients know this came from a complaint
        java.util.Map<String, Object> params = new java.util.LinkedHashMap<>();
        params.put("color", "#FFCDD2");
        params.put("fromComplaint", true);
        params.put("complaintId", request.getComplaintId());
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_CREATED,
                "طلب صيانة من شكوى | Maintenance request from complaint",
                "Request " + request.getRequestNumber() + " created from complaint.",
                params
        );
    }

    private void notifyRequestCreated(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyAccountantIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_CREATED,
                "New maintenance request",
                "Request " + request.getRequestNumber() + " has been created."
        );
    }

    private void notifyRequestAssigned(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        recipientIds.addAll(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_ASSIGNED,
                "Maintenance request assigned",
                "Request " + request.getRequestNumber() + " has been assigned."
        );
    }

    private void notifyRequestScheduled(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        recipientIds.addAll(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_SCHEDULED,
                "Visit scheduled",
                "A visit has been scheduled for request " + request.getRequestNumber()
                        + " on " + request.getScheduledDate()
        );
    }

    private void notifyScheduleAccepted(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        recipientIds.addAll(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_SCHEDULE_ACCEPTED,
                "Schedule accepted",
                "Tenant accepted the visit schedule for request " + request.getRequestNumber()
        );
    }

    private void notifyScheduleRejected(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        recipientIds.addAll(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_SCHEDULE_REJECTED,
                "Schedule rejected",
                "Tenant rejected the visit schedule for request " + request.getRequestNumber()
                        + ". Note: " + request.getScheduleRejectionNote()
        );
    }

    private void notifyWorkStarted(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        recipientIds.addAll(propertyAdminIds(request.getPropertyId()));
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_ASSIGNED,
                "Work started",
                "Maintenance officer started work on request " + request.getRequestNumber()
        );
    }

    private void notifyVisitReported(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>(propertyAdminIds(request.getPropertyId()));
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_VISIT_REPORTED,
                "Visit report submitted",
                "Visit report submitted for request " + request.getRequestNumber()
                        + ". Status: " + request.getStatus()
        );
    }

    private void notifyRequestCancelled(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>(propertyAdminIds(request.getPropertyId()));
        if (request.getAssignedTo() != null) recipientIds.add(request.getAssignedTo());
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        recipientIds.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipientIds.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipientIds = recipientIds.stream().distinct().collect(Collectors.toList());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_CANCELLED,
                "Maintenance request cancelled",
                "Request " + request.getRequestNumber() + " has been cancelled."
        );
    }

    private List<Long> propertyAdminIds(Long propertyId) {
        Collection<User> users = new ArrayList<>(userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN));
        if (propertyId != null) {
            users.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.GENERAL_MANAGER));
        } else {
            users.addAll(userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER));
        }
        return users.stream().map(User::getId).distinct().collect(Collectors.toList());
    }

    private List<Long> propertyAccountantIds(Long propertyId) {
        if (propertyId == null) {
            return userRepository.findByRoleAndActiveTrue(UserRole.ACCOUNTANT).stream()
                    .map(User::getId)
                    .distinct()
                    .collect(Collectors.toList());
        }
        return userRepository.findByRoleAndActiveTrue(UserRole.ACCOUNTANT).stream()
                .filter(u -> u.getPropertyId() == null || propertyId.equals(u.getPropertyId()))
                .map(User::getId)
                .distinct()
                .collect(Collectors.toList());
    }

    private java.util.Optional<Long> tenantUserId(Long tenantId) {
        if (tenantId == null) return java.util.Optional.empty();
        return tenantRepository.findById(tenantId).map(t -> t.getUserId()).filter(id -> id != null);
    }

    private void assertInternalOfficerForProperty(Long officerUserId, Long propertyId) {
        User officer = userRepository.findById(officerUserId)
                .orElseThrow(() -> AppException.badRequest("Maintenance officer not found: " + officerUserId));
        if (officer.getRole() != UserRole.MAINTENANCE_OFFICER_INTERNAL || !officer.isActive()) {
            throw AppException.badRequest("Invalid maintenance officer");
        }
        if (officer.getMaintenanceOfficerType() != MaintenanceOfficerType.INTERNAL_PROPERTY) {
            throw AppException.badRequest("Property default officer must be INTERNAL_PROPERTY type");
        }
        if (officer.getPropertyId() == null || !officer.getPropertyId().equals(propertyId)) {
            throw AppException.badRequest("Maintenance officer must be linked to this property");
        }
    }

    private void assertCanAssignRequest(User caller, MaintenanceRequest request) {
        if (caller.getRole() == UserRole.SUPER_ADMIN) {
            return;
        }
        if (caller.getRole() == UserRole.GENERAL_MANAGER) {
            if (caller.getPropertyId() != null && !caller.getPropertyId().equals(request.getPropertyId())) {
                throw AppException.forbidden("Access denied");
            }
            return;
        }
        if (caller.getRole() == UserRole.ACCOUNTANT) {
            if (caller.getPropertyId() != null && !caller.getPropertyId().equals(request.getPropertyId())) {
                throw AppException.forbidden("Access denied");
            }
            if (request.getStatus() == RequestStatus.PENDING && request.getAssignedTo() == null) {
                return;
            }
            throw AppException.forbidden("Access denied");
        }
        if (UserRole.isMaintenanceStaff(caller.getRole())
                && request.getStatus() == RequestStatus.PENDING
                && request.getAssignedTo() == null
                && isContractorCompanyQueueVisible(caller, request)) {
            return;
        }
        throw AppException.forbidden("Access denied");
    }

    private void assertAssignableOfficer(User officer, MaintenanceRequest request) {
        if (!UserRole.isMaintenanceStaff(officer.getRole()) || !officer.isActive()) {
            throw AppException.badRequest("Invalid officer account");
        }
        if (request.getContractorCompanyId() != null) {
            boolean contractorOk = officer.getContractorCompanyId() != null
                    && officer.getContractorCompanyId().equals(request.getContractorCompanyId())
                    && officer.getPropertyId() != null
                    && officer.getPropertyId().equals(request.getPropertyId())
                    && (officer.getRole() == UserRole.MAINTENANCE_COMPANY
                        || officer.getMaintenanceOfficerType() == MaintenanceOfficerType.CONTRACTOR_COMPANY);
            if (!contractorOk) {
                throw AppException.badRequest("Officer must belong to the routing contractor company and this property");
            }
            return;
        }
        if (officer.getPropertyId() != null && !officer.getPropertyId().equals(request.getPropertyId())) {
            throw AppException.badRequest("Officer must be linked to this property");
        }
    }

    private boolean isContractorCompanyQueueVisible(User user, MaintenanceRequest request) {
        return request.getContractorCompanyId() != null
                && request.getAssignedTo() == null
                && request.getStatus() == RequestStatus.PENDING
                && user.getContractorCompanyId() != null
                && user.getContractorCompanyId().equals(request.getContractorCompanyId())
                && activeContractPropertyIdsForCompany(user.getContractorCompanyId()).contains(request.getPropertyId())
                && (user.getRole() == UserRole.MAINTENANCE_COMPANY
                    || user.getMaintenanceOfficerType() == MaintenanceOfficerType.CONTRACTOR_COMPANY);
    }

    private List<Long> contractorStaffIds(Long companyId, Long propertyId) {
        return userRepository.findActiveContractorStaffForProperty(propertyId, companyId)
                .stream()
                .map(User::getId)
                .collect(Collectors.toList());
    }

    private void assertCurrentContractorProperty(Long propertyId) {
        User user = requireUser();
        if (user.getContractorCompanyId() == null) {
            return;
        }
        if (!activeContractPropertyIdsForCompany(user.getContractorCompanyId()).contains(propertyId)) {
            throw AppException.forbidden("Access denied");
        }
    }

    private List<Long> activeContractPropertyIdsForCompany(Long companyId) {
        if (companyId == null) {
            return List.of();
        }
        return maintenanceContractRepository.findActiveOngoingByContractor(companyId, LocalDate.now()).stream()
                .map(MaintenanceContract::getPropertyId)
                .filter(id -> id != null)
                .distinct()
                .toList();
    }

    /**
     * Auto-assign company-routed requests when exactly one contractor staff member exists
     * for this property/company pair; otherwise keep queue assignment open.
     */
    private Long resolveContractorAutoAssignee(Long companyId, Long propertyId) {
        if (companyId == null || propertyId == null) {
            return null;
        }
        List<Long> staffIds = contractorStaffIds(companyId, propertyId);
        return staffIds.size() == 1 ? staffIds.get(0) : null;
    }

    private MaintenanceRequest find(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Maintenance request not found: " + id));
    }

    private MaintenanceRequestResponse toResponse(MaintenanceRequest r) {
        String tenantName = null;
        if (r.getTenantId() != null) {
            tenantName = tenantRepository.findById(r.getTenantId())
                    .map(t -> t.getFullName()).orElse(null);
        }

        String assignedOfficerName = null;
        String assignedOfficerPhone = null;
        if (r.getAssignedTo() != null) {
            var officer = userRepository.findById(r.getAssignedTo()).orElse(null);
            if (officer != null) {
                assignedOfficerName = officer.getFullName();
                assignedOfficerPhone = officer.getPhone();
            }
        }

        String propertyName = null;
        String propertyNameAr = null;
        String propertyNameEn = null;
        if (r.getPropertyId() != null) {
            var property = propertyRepository.findById(r.getPropertyId()).orElse(null);
            if (property != null) {
                propertyNameAr = LocalizedNameResolver.safe(property.getPropertyNameAr());
                propertyNameEn = LocalizedNameResolver.safe(property.getPropertyNameEn());
                propertyName = LocalizedNameResolver.resolve(propertyNameAr, propertyNameEn, property.getPropertyName());
            }
        }

        String unitNumber = null;
        if (r.getUnitId() != null) {
            unitNumber = unitRepository.findById(r.getUnitId())
                    .map(u -> u.getUnitNumber()).orElse(null);
        }

        String categoryNameAr = null;
        String categoryNameEn = null;
        if (r.getCategoryId() != null) {
            var cat = categoryRepository.findById(r.getCategoryId()).orElse(null);
            if (cat != null) {
                categoryNameAr = cat.getNameAr();
                categoryNameEn = cat.getNameEn();
            }
        }

        return MaintenanceRequestResponse.builder()
                .id(r.getId())
                .requestNumber(r.getRequestNumber())
                .tenantId(r.getTenantId())
                .unitId(r.getUnitId())
                .propertyId(r.getPropertyId())
                .categoryId(r.getCategoryId())
                .title(r.getTitle())
                .description(r.getDescription())
                .priority(r.getPriority())
                .status(r.getStatus())
                .assignedTo(r.getAssignedTo())
                .contractorCompanyId(r.getContractorCompanyId())
                .scheduledDate(r.getScheduledDate())
                .scheduledTimeFrom(r.getScheduledTimeFrom())
                .scheduledTimeTo(r.getScheduledTimeTo())
                .tenantNotes(r.getTenantNotes())
                .closedAt(r.getClosedAt())
                .scheduleAccepted(r.getScheduleAccepted())
                .scheduleRejectionNote(r.getScheduleRejectionNote())
                .tenantName(tenantName)
                .assignedOfficerName(assignedOfficerName)
                .assignedOfficerPhone(assignedOfficerPhone)
                .propertyName(propertyName)
                .propertyNameAr(propertyNameAr)
                .propertyNameEn(propertyNameEn)
                .unitNumber(unitNumber)
                .categoryNameAr(categoryNameAr)
                .categoryNameEn(categoryNameEn)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .createdBy(r.getCreatedBy())
                .createdByName(resolveUserName(r.getCreatedBy()))
                .modifiedBy(r.getModifiedBy())
                .modifiedByName(resolveUserName(r.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private VisitReportResponse toVisitResponse(VisitReport v) {
        return VisitReportResponse.builder()
                .id(v.getId())
                .requestId(v.getRequestId())
                .officerId(v.getOfficerId())
                .visitDate(v.getVisitDate())
                .visitOutcome(v.getVisitOutcome())
                .officerNotes(v.getOfficerNotes())
                .workDone(v.getWorkDone())
                .hasPurchase(v.isHasPurchase())
                .purchaseAmount(v.getPurchaseAmount())
                .purchaseNotes(v.getPurchaseNotes())
                .receiptUrl(v.getReceiptUrl())
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .build();
    }
}
