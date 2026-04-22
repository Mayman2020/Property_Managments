package com.propertymanagement.modules.maintenance.request;

import com.propertymanagement.modules.maintenance.category.MaintenanceCategoryRepository;
import com.propertymanagement.modules.maintenance.request.dto.*;
import com.propertymanagement.modules.maintenance.visit.VisitReport;
import com.propertymanagement.modules.maintenance.visit.VisitReportItem;
import com.propertymanagement.modules.maintenance.visit.VisitReportItemRepository;
import com.propertymanagement.modules.maintenance.visit.VisitReportRepository;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportRequest;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportResponse;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceRequestService {

    private final MaintenanceRequestRepository requestRepository;
    private final VisitReportRepository visitReportRepository;
    private final VisitReportItemRepository visitReportItemRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final MaintenanceCategoryRepository categoryRepository;

    public Page<MaintenanceRequestResponse> getAll(Pageable pageable) {
        return requestRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByProperty(Long propertyId, Pageable pageable) {
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
        } else if (user.getRole() != UserRole.SUPER_ADMIN && user.getRole() != UserRole.PROPERTY_ADMIN) {
            throw AppException.forbidden("Access denied");
        }
        return getByTenant(tenantId, pageable);
    }

    public Page<MaintenanceRequestResponse> getByOfficer(Long officerId, Pageable pageable) {
        return requestRepository.findByAssignedTo(officerId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByOfficerSecured(Long officerId, Pageable pageable) {
        User user = requireUser();
        if (user.getRole() == UserRole.MAINTENANCE_OFFICER) {
            if (!user.getId().equals(officerId)) {
                throw AppException.forbidden("Access denied");
            }
        } else if (user.getRole() != UserRole.SUPER_ADMIN && user.getRole() != UserRole.PROPERTY_ADMIN) {
            throw AppException.forbidden("Access denied");
        }
        return getByOfficer(officerId, pageable);
    }

    public Page<MaintenanceRequestResponse> getByStatus(RequestStatus status, Pageable pageable) {
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
            case PROPERTY_ADMIN -> {
                if (user.getPropertyId() != null && !user.getPropertyId().equals(request.getPropertyId())) {
                    throw AppException.forbidden("Access denied");
                }
            }
            case TENANT -> {
                tenantRepository.findByUserId(user.getId())
                        .filter(t -> t.getId().equals(request.getTenantId()))
                        .orElseThrow(() -> AppException.forbidden("Access denied"));
            }
            case MAINTENANCE_OFFICER -> {
                if (request.getAssignedTo() == null || !request.getAssignedTo().equals(user.getId())) {
                    throw AppException.forbidden("Access denied");
                }
            }
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

    @Transactional
    public MaintenanceRequestResponse create(CreateRequestDto dto) {
        String requestNumber = generateRequestNumber();
        MaintenanceRequest request = MaintenanceRequest.builder()
                .requestNumber(requestNumber)
                .propertyId(dto.getPropertyId())
                .unitId(dto.getUnitId())
                .tenantId(dto.getTenantId())
                .categoryId(dto.getResolvedCategoryId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .priority(dto.getPriority() != null ? dto.getPriority() : RequestPriority.NORMAL)
                .status(RequestStatus.PENDING)
                .tenantNotes(dto.getTenantNotes())
                .build();
        MaintenanceRequest saved = requestRepository.save(request);
        notifyRequestCreated(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse assign(Long id, AssignRequestDto dto) {
        MaintenanceRequest request = find(id);
        validateTransition(request.getStatus(), RequestStatus.ASSIGNED);
        request.setAssignedTo(dto.getOfficerId());
        request.setStatus(RequestStatus.ASSIGNED);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyRequestAssigned(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse schedule(Long id, ScheduleRequestDto dto) {
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

        if (dto.getItems() != null) {
            for (VisitReportRequest.VisitReportItemDto itemDto : dto.getItems()) {
                VisitReportItem item = VisitReportItem.builder()
                        .visitReportId(saved.getId())
                        .itemId(itemDto.getItemId())
                        .quantityUsed(itemDto.getQuantityUsed())
                        .notes(itemDto.getNotes())
                        .build();
                visitReportItemRepository.save(item);
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

    public VisitReportResponse getVisitReport(Long requestId) {
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

    private String generateRequestNumber() {
        String year = String.valueOf(Year.now().getValue());
        long count = requestRepository.countByRequestNumberStartingWith("MR-" + year) + 1;
        return String.format("MR-%s-%05d", year, count);
    }

    private Long currentUserId() {
        return requireUser().getId();
    }

    private void notifyRequestCreated(MaintenanceRequest request) {
        List<Long> recipientIds = propertyAdminIds(request.getPropertyId());
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
        recipientIds.addAll(propertyAdminIds(request.getPropertyId()));
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
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
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
            users.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.PROPERTY_ADMIN));
        } else {
            users.addAll(userRepository.findByRoleAndActiveTrue(UserRole.PROPERTY_ADMIN));
        }
        return users.stream().map(User::getId).distinct().collect(Collectors.toList());
    }

    private java.util.Optional<Long> tenantUserId(Long tenantId) {
        if (tenantId == null) return java.util.Optional.empty();
        return tenantRepository.findById(tenantId).map(t -> t.getUserId()).filter(id -> id != null);
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
        if (r.getAssignedTo() != null) {
            assignedOfficerName = userRepository.findById(r.getAssignedTo())
                    .map(u -> u.getFullName()).orElse(null);
        }

        String propertyName = null;
        if (r.getPropertyId() != null) {
            propertyName = propertyRepository.findById(r.getPropertyId())
                    .map(p -> p.getPropertyName()).orElse(null);
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
                .scheduledDate(r.getScheduledDate())
                .scheduledTimeFrom(r.getScheduledTimeFrom())
                .scheduledTimeTo(r.getScheduledTimeTo())
                .tenantNotes(r.getTenantNotes())
                .closedAt(r.getClosedAt())
                .scheduleAccepted(r.getScheduleAccepted())
                .scheduleRejectionNote(r.getScheduleRejectionNote())
                .tenantName(tenantName)
                .assignedOfficerName(assignedOfficerName)
                .propertyName(propertyName)
                .unitNumber(unitNumber)
                .categoryNameAr(categoryNameAr)
                .categoryNameEn(categoryNameEn)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
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
