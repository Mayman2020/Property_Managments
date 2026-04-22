package com.propertymanagement.modules.maintenance.request;

import com.propertymanagement.modules.maintenance.request.dto.*;
import com.propertymanagement.modules.maintenance.visit.VisitReport;
import com.propertymanagement.modules.maintenance.visit.VisitReportItem;
import com.propertymanagement.modules.maintenance.visit.VisitReportItemRepository;
import com.propertymanagement.modules.maintenance.visit.VisitReportRepository;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportRequest;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportResponse;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.tenant.TenantRepository;
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

    public Page<MaintenanceRequestResponse> getAll(Pageable pageable) {
        return requestRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByProperty(Long propertyId, Pageable pageable) {
        return requestRepository.findByPropertyId(propertyId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByTenant(Long tenantId, Pageable pageable) {
        return requestRepository.findByTenantId(tenantId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByOfficer(Long officerId, Pageable pageable) {
        return requestRepository.findByAssignedTo(officerId, pageable).map(this::toResponse);
    }

    public Page<MaintenanceRequestResponse> getByStatus(RequestStatus status, Pageable pageable) {
        return requestRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    public MaintenanceRequestResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public MaintenanceRequestResponse create(CreateRequestDto dto) {
        String requestNumber = generateRequestNumber();
        MaintenanceRequest request = MaintenanceRequest.builder()
                .requestNumber(requestNumber)
                .propertyId(dto.getPropertyId())
                .unitId(dto.getUnitId())
                .tenantId(dto.getTenantId())
                .categoryId(dto.getCategoryId())
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
        MaintenanceRequest saved = requestRepository.save(request);
        notifyRequestScheduled(saved);
        return toResponse(saved);
    }

    @Transactional
    public MaintenanceRequestResponse startWork(Long id) {
        MaintenanceRequest request = find(id);
        validateTransition(request.getStatus(), RequestStatus.IN_PROGRESS);
        request.setStatus(RequestStatus.IN_PROGRESS);
        MaintenanceRequest saved = requestRepository.save(request);
        notifyRequestCancelled(saved);
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
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private void notifyRequestCreated(MaintenanceRequest request) {
        List<Long> recipientIds = propertyAdminIds(request.getPropertyId());
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds,
                currentUserId(),
                request.getPropertyId(),
                request.getId(),
                NotificationType.REQUEST_CREATED,
                "New maintenance request",
                "Request " + request.getRequestNumber() + " has been created."
        );
    }

    private void notifyRequestAssigned(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        if (request.getAssignedTo() != null) {
            recipientIds.add(request.getAssignedTo());
        }
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds,
                currentUserId(),
                request.getPropertyId(),
                request.getId(),
                NotificationType.REQUEST_ASSIGNED,
                "Maintenance request assigned",
                "Request " + request.getRequestNumber() + " has been assigned."
        );
    }

    private void notifyRequestScheduled(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>();
        if (request.getAssignedTo() != null) {
            recipientIds.add(request.getAssignedTo());
        }
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds,
                currentUserId(),
                request.getPropertyId(),
                request.getId(),
                NotificationType.REQUEST_SCHEDULED,
                "Maintenance request scheduled",
                "Request " + request.getRequestNumber() + " has been scheduled."
        );
    }

    private void notifyVisitReported(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>(propertyAdminIds(request.getPropertyId()));
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds,
                currentUserId(),
                request.getPropertyId(),
                request.getId(),
                NotificationType.REQUEST_VISIT_REPORTED,
                "Visit report submitted",
                "Visit report submitted for request " + request.getRequestNumber()
                        + ". Current status: " + request.getStatus()
        );
    }

    private void notifyRequestCancelled(MaintenanceRequest request) {
        List<Long> recipientIds = new ArrayList<>(propertyAdminIds(request.getPropertyId()));
        if (request.getAssignedTo() != null) {
            recipientIds.add(request.getAssignedTo());
        }
        tenantUserId(request.getTenantId()).ifPresent(recipientIds::add);
        if (recipientIds.isEmpty()) return;
        notificationService.createForRecipients(
                recipientIds,
                currentUserId(),
                request.getPropertyId(),
                request.getId(),
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
        if (tenantId == null) {
            return java.util.Optional.empty();
        }
        return tenantRepository.findById(tenantId).map(t -> t.getUserId()).filter(id -> id != null);
    }

    private MaintenanceRequest find(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Maintenance request not found: " + id));
    }

    private MaintenanceRequestResponse toResponse(MaintenanceRequest r) {
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
