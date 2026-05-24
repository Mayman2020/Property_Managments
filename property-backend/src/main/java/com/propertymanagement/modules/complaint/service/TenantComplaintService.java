package com.propertymanagement.modules.complaint.service;

import com.propertymanagement.modules.complaint.dto.*;
import com.propertymanagement.modules.complaint.entity.*;
import com.propertymanagement.modules.complaint.repository.*;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.maintenance.request.dto.CreateRequestDto;
import com.propertymanagement.modules.maintenance.request.dto.MaintenanceRequestResponse;
import com.propertymanagement.modules.maintenance.request.entity.RequestAttachment;
import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;
import com.propertymanagement.modules.maintenance.request.repository.RequestAttachmentRepository;
import com.propertymanagement.modules.maintenance.request.service.MaintenanceRequestService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import java.util.Map;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class TenantComplaintService {

    private final TenantComplaintRepository complaintRepository;
    private final ComplaintReplyRepository replyRepository;
    private final ComplaintRatingRepository ratingRepository;
    private final ComplaintAttachmentRepository attachmentRepository;
    private final OwnerPropertyAccessService ownerPropertyAccessService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final LeaseContractRepository leaseContractRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final MaintenanceRequestService maintenanceRequestService;
    private final RequestAttachmentRepository requestAttachmentRepository;

    // ── ADMIN / OWNER scope ──────────────────────────────────────────────

    public Page<ComplaintListItemResponse> getAll(Pageable pageable, String status, Long propertyId) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        Page<TenantComplaint> page;
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            page = complaintRepository.findFilteredByPropertyIds(ownerScope, status, propertyId, pageable);
        } else {
            page = complaintRepository.findFiltered(status, propertyId, pageable);
        }
        return page.map(this::toListItem);
    }

    // ── TENANT: their own complaints ─────────────────────────────────────

    public List<ComplaintResponse> getMyComplaints() {
        User me = currentUser();
        Long tenantId = tenantRepository.findByUserId(me.getId())
                .map(t -> t.getId())
                .orElseThrow(() -> AppException.notFound("No tenant linked to current user"));

        return complaintRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(c -> toResponse(c, false))
                .collect(Collectors.toList());
    }

    public ComplaintResponse getById(Long id) {
        TenantComplaint c = findById(id);
        User me = currentUser();
        if (me.getRole() == UserRole.TENANT) {
            Long tenantId = tenantRepository.findByUserId(me.getId())
                    .map(t -> t.getId()).orElse(null);
            if (!c.getTenantId().equals(tenantId)) {
                throw AppException.forbidden("Access denied");
            }
        }
        return toResponse(c, true);
    }

    // ── TENANT: active units for pre-fill ────────────────────────────────

    public List<TenantActiveUnitDto> getMyActiveUnits() {
        User me = currentUser();
        Long tenantId = tenantRepository.findByUserId(me.getId())
                .map(t -> t.getId())
                .orElseThrow(() -> AppException.notFound("No tenant linked to current user"));

        return leaseContractRepository.findByTenantId(tenantId).stream()
                .filter(c -> ContractStatus.ACTIVE == c.getStatus())
                .map(c -> {
                    String unitNumber = unitRepository.findById(c.getUnitId())
                            .map(Unit::getUnitNumber).orElse(String.valueOf(c.getUnitId()));
                    Property prop = propertyRepository.findById(c.getPropertyId()).orElse(null);
                    return TenantActiveUnitDto.builder()
                            .contractId(c.getId())
                            .unitId(c.getUnitId())
                            .unitNumber(unitNumber)
                            .propertyId(c.getPropertyId())
                            .propertyName(prop != null ? prop.getPropertyName() : null)
                            .propertyNameAr(prop != null ? prop.getPropertyNameAr() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ── CREATE ───────────────────────────────────────────────────────────

    private static final Set<String> ALLOWED_COMPLAINT_TYPES = Set.of(
            "NEIGHBOR_NOISE", "COMMON_AREA", "CLEANLINESS",
            "SECURITY", "MANAGEMENT", "SERVICE", "OTHER");

    private static final Set<String> ALLOWED_PRIORITIES = Set.of("LOW", "NORMAL", "HIGH", "URGENT");

    @Transactional
    public TenantComplaint create(ComplaintRequest request) {
        String complaintType = normalizeAllowedValue(
                request.getComplaintType(), ALLOWED_COMPLAINT_TYPES, "INVALID_COMPLAINT_TYPE");
        String priority = normalizeAllowedValue(
                request.getPriority(), ALLOWED_PRIORITIES, "INVALID_COMPLAINT_PRIORITY");

        TenantComplaint complaint = TenantComplaint.builder()
                .tenantId(request.getTenantId())
                .unitId(request.getUnitId())
                .propertyId(request.getPropertyId())
                .complaintType(complaintType)
                .title(request.getTitle())
                .description(request.getDescription())
                .status("OPEN")
                .priority(priority != null ? priority : "NORMAL")
                .attachmentUrl(request.getAttachmentUrl())
                .build();
        TenantComplaint saved = complaintRepository.save(complaint);

        if (request.getAttachments() != null && !request.getAttachments().isEmpty()) {
            User me = currentUser();
            List<ComplaintAttachment> attachments = request.getAttachments().stream()
                    .filter(a -> a.getFileUrl() != null && !a.getFileUrl().isBlank())
                    .map(a -> ComplaintAttachment.builder()
                            .complaintId(saved.getId())
                            .fileUrl(a.getFileUrl())
                            .fileType(a.getFileType())
                            .fileName(a.getFileName())
                            .fileSizeKb(a.getFileSizeKb())
                            .uploadedBy(me.getId())
                            .build())
                    .collect(Collectors.toList());
            attachmentRepository.saveAll(attachments);
        }

        notifyAdminAudience(saved.getPropertyId(),
                NotificationType.COMPLAINT_SUBMITTED,
                "NOTIFICATIONS.COMPLAINT_SUBMITTED_TITLE",
                "NOTIFICATIONS.COMPLAINT_SUBMITTED_BODY",
                Map.of("title", saved.getTitle()));
        return saved;
    }

    // ── CREATE MAINTENANCE REQUEST FROM COMPLAINT ────────────────────────

    @Transactional
    public MaintenanceRequestResponse createMaintenanceRequest(Long complaintId,
                                                               CreateMaintenanceFromComplaintDto dto) {
        TenantComplaint complaint = findById(complaintId);

        if (complaint.getMaintenanceRequestId() != null) {
            throw AppException.badRequest("A maintenance request already exists for this complaint");
        }

        String title = (dto.getTitleOverride() != null && !dto.getTitleOverride().isBlank())
                ? dto.getTitleOverride()
                : complaint.getTitle();

        CreateRequestDto createDto = new CreateRequestDto();
        createDto.setPropertyId(complaint.getPropertyId());
        createDto.setUnitId(complaint.getUnitId());
        createDto.setTenantId(complaint.getTenantId());
        createDto.setCategoryId(dto.getCategoryId());
        createDto.setTitle(title);
        createDto.setDescription(complaint.getDescription());
        createDto.setPriority(RequestPriority.URGENT);

        MaintenanceRequestResponse response = maintenanceRequestService.createFromComplaint(createDto, complaintId);

        // Copy complaint attachments to the new maintenance request
        List<ComplaintAttachment> complaintAttachments =
                attachmentRepository.findByComplaintIdOrderByUploadedAtAsc(complaintId);
        if (!complaintAttachments.isEmpty() && response.getId() != null) {
            Long actorId = currentUser().getId();
            List<RequestAttachment> requestAttachments = complaintAttachments.stream()
                    .map(ca -> RequestAttachment.builder()
                            .requestId(response.getId())
                            .fileUrl(ca.getFileUrl())
                            .fileType(ca.getFileType() != null ? ca.getFileType() : "DOCUMENT")
                            .fileName(ca.getFileName())
                            .fileSizeKb(ca.getFileSizeKb())
                            .uploadedBy(actorId)
                            .build())
                    .collect(Collectors.toList());
            requestAttachmentRepository.saveAll(requestAttachments);
        }

        complaint.setMaintenanceRequestId(response.getId());
        complaintRepository.save(complaint);

        return response;
    }

    // ── REPLY ────────────────────────────────────────────────────────────

    @Transactional
    public ComplaintReply addReply(Long id, ComplaintReplyRequest request) {
        TenantComplaint complaint = findById(id);
        User me = currentUser();

        ComplaintReply reply = ComplaintReply.builder()
                .complaintId(id)
                .senderUserId(me.getId())
                .senderName(me.getFullName() != null ? me.getFullName() : me.getUsername())
                .senderRole(me.getRole().name())
                .message(request.getMessage())
                .build();
        ComplaintReply saved = replyRepository.save(reply);

        Long tenantUserId = tenantRepository.findById(complaint.getTenantId())
                .map(t -> t.getUserId()).orElse(null);
        if (tenantUserId != null) {
            notificationService.createForRecipients(
                    List.of(tenantUserId), null, complaint.getPropertyId(), null,
                    NotificationType.COMPLAINT_REPLY_RECEIVED,
                    "رد على شكواك",
                    "تم الرد على شكواك: " + complaint.getTitle());
        }
        return saved;
    }

    // ── CLOSE ────────────────────────────────────────────────────────────

    @Transactional
    public TenantComplaint closeComplaint(Long id) {
        TenantComplaint complaint = findById(id);
        if ("CLOSED".equals(complaint.getStatus()) || "RESOLVED".equals(complaint.getStatus())) {
            throw AppException.badRequest("Complaint is already closed or resolved");
        }
        User me = currentUser();

        if (me.getRole() == UserRole.TENANT) {
            Long tenantId = tenantRepository.findByUserId(me.getId()).map(t -> t.getId()).orElse(null);
            if (!complaint.getTenantId().equals(tenantId)) throw AppException.forbidden("Access denied");
        } else {
            ownerPropertyAccessService.assertOwnerCanAccessProperty(complaint.getPropertyId());
        }

        complaint.setStatus("CLOSED");
        complaint.setResolvedAt(LocalDateTime.now());
        TenantComplaint saved = complaintRepository.save(complaint);

        if (me.getRole() == UserRole.TENANT) {
            notifyAdminAudience(saved.getPropertyId(),
                    NotificationType.COMPLAINT_CLOSED,
                    "NOTIFICATIONS.COMPLAINT_CLOSED_TITLE",
                    "NOTIFICATIONS.COMPLAINT_CLOSED_BODY",
                    Map.of("title", saved.getTitle()));
        } else {
            Long tenantUserId = tenantRepository.findById(saved.getTenantId())
                    .map(t -> t.getUserId()).orElse(null);
            if (tenantUserId != null) {
                notificationService.createForRecipients(
                        List.of(tenantUserId), null, saved.getPropertyId(), null,
                        NotificationType.COMPLAINT_CLOSED,
                        "تم إغلاق شكواك",
                        "تم إغلاق شكواك: " + saved.getTitle());
            }
        }
        return saved;
    }

    // ── RATING ───────────────────────────────────────────────────────────

    @Transactional
    public ComplaintRating submitRating(Long id, ComplaintRatingRequest request) {
        TenantComplaint complaint = findById(id);
        if (!"CLOSED".equals(complaint.getStatus()) && !"RESOLVED".equals(complaint.getStatus())) {
            throw AppException.badRequest("Complaint must be closed before rating");
        }
        if (ratingRepository.existsByComplaintId(id)) {
            throw AppException.badRequest("Complaint already rated");
        }
        User me = currentUser();
        ComplaintRating rating = ComplaintRating.builder()
                .complaintId(id)
                .raterUserId(me.getId())
                .raterRole(me.getRole().name())
                .rating(request.getRating())
                .build();
        ComplaintRating saved = ratingRepository.save(rating);

        Long tenantUserId = tenantRepository.findById(complaint.getTenantId())
                .map(t -> t.getUserId()).orElse(null);
        List<Long> adminIds = adminUserIds(complaint.getPropertyId());
        List<Long> ownerIds = propertyOwnerPortalRecipientService.portalRecipientUserIds(complaint.getPropertyId());

        List<Long> recipients = Stream.of(
                tenantUserId != null ? List.of(tenantUserId) : List.<Long>of(),
                adminIds,
                ownerIds
        ).flatMap(List::stream).distinct().collect(Collectors.toList());

        notificationService.createForRecipients(
                recipients, null, complaint.getPropertyId(), null,
                NotificationType.COMPLAINT_RATED,
                "تقييم شكوى",
                "تم تقييم الشكوى: " + complaint.getTitle());
        return saved;
    }

    public ComplaintRating getRating(Long id) {
        return ratingRepository.findByComplaintId(id).orElse(null);
    }

    // ── EXISTING ADMIN ACTIONS ────────────────────────────────────────────

    @Transactional
    public TenantComplaint assign(Long id, Long officerId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot assign complaints to staff");
        TenantComplaint complaint = findById(id);
        complaint.setAssignedTo(officerId);
        complaint.setStatus("IN_REVIEW");
        return complaintRepository.save(complaint);
    }

    @Transactional
    public TenantComplaint resolve(Long id, String resolution) {
        TenantComplaint complaint = findById(id);
        ownerPropertyAccessService.assertOwnerCanAccessProperty(complaint.getPropertyId());
        complaint.setStatus("RESOLVED");
        complaint.setResolution(resolution);
        complaint.setResolvedAt(LocalDateTime.now());
        return complaintRepository.save(complaint);
    }

    // ── HELPERS ──────────────────────────────────────────────────────────

    private TenantComplaint findById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Complaint not found: " + id));
    }

    /**
     * Normalize and validate a free-text enum-like value against an allow-list.
     * Returns {@code null} when the caller passed {@code null}/blank so callers
     * can still apply their own default. Throws an HTTP 400 AppException for
     * values outside the allow-list instead of letting them leak to the DB
     * CHECK as DataIntegrityViolationException (HTTP 500).
     */
    private static String normalizeAllowedValue(String raw, Set<String> allowed, String errorCode) {
        if (raw == null || raw.isBlank()) return null;
        String normalized = raw.trim().toUpperCase();
        if (!allowed.contains(normalized)) {
            throw AppException.badRequest(errorCode);
        }
        return normalized;
    }

    private User currentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private ComplaintResponse toResponse(TenantComplaint c, boolean includeReplies) {
        ComplaintResponse.ComplaintResponseBuilder b = ComplaintResponse.builder()
                .id(c.getId())
                .tenantId(c.getTenantId())
                .unitId(c.getUnitId())
                .propertyId(c.getPropertyId())
                .complaintType(c.getComplaintType())
                .title(c.getTitle())
                .description(c.getDescription())
                .status(c.getStatus())
                .priority(c.getPriority())
                .resolution(c.getResolution())
                .attachmentUrl(c.getAttachmentUrl())
                .maintenanceRequestId(c.getMaintenanceRequestId())
                .createdAt(c.getCreatedAt())
                .resolvedAt(c.getResolvedAt());

        enrichContext(c, b);

        // Always include attachments
        List<ComplaintResponse.AttachmentDto> attachments = attachmentRepository
                .findByComplaintIdOrderByUploadedAtAsc(c.getId())
                .stream()
                .map(a -> ComplaintResponse.AttachmentDto.builder()
                        .id(a.getId())
                        .fileUrl(a.getFileUrl())
                        .fileType(a.getFileType())
                        .fileName(a.getFileName())
                        .fileSizeKb(a.getFileSizeKb())
                        .build())
                .collect(Collectors.toList());
        b.attachments(attachments);

        if (includeReplies) {
            List<ComplaintResponse.ReplyDto> replies = replyRepository
                    .findByComplaintIdOrderByCreatedAtAsc(c.getId())
                    .stream()
                    .map(r -> ComplaintResponse.ReplyDto.builder()
                            .id(r.getId())
                            .senderUserId(r.getSenderUserId())
                            .senderName(r.getSenderName())
                            .senderRole(r.getSenderRole())
                            .message(r.getMessage())
                            .createdAt(r.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
            b.replies(replies);

            ratingRepository.findByComplaintId(c.getId()).ifPresent(rat ->
                    b.rating(ComplaintResponse.RatingDto.builder()
                            .id(rat.getId())
                            .rating(rat.getRating())
                            .raterRole(rat.getRaterRole())
                            .ratedAt(rat.getRatedAt())
                            .build()));
        }
        return b.build();
    }

    private ComplaintListItemResponse toListItem(TenantComplaint c) {
        ComplaintListItemResponse.ComplaintListItemResponseBuilder b = ComplaintListItemResponse.builder()
                .id(c.getId())
                .tenantId(c.getTenantId())
                .unitId(c.getUnitId())
                .propertyId(c.getPropertyId())
                .complaintType(c.getComplaintType())
                .title(c.getTitle())
                .description(c.getDescription())
                .status(c.getStatus())
                .priority(c.getPriority())
                .maintenanceRequestId(c.getMaintenanceRequestId())
                .createdAt(c.getCreatedAt())
                .resolvedAt(c.getResolvedAt());
        enrichContext(c, b);
        return b.build();
    }

    private void enrichContext(TenantComplaint c, ComplaintResponse.ComplaintResponseBuilder b) {
        if (c.getTenantId() != null) {
            tenantRepository.findById(c.getTenantId()).ifPresent(t -> applyTenant(t, b));
        }
        if (c.getUnitId() != null) {
            unitRepository.findById(c.getUnitId()).ifPresent(u -> b.unitNumber(u.getUnitNumber()));
        }
        if (c.getPropertyId() != null) {
            propertyRepository.findById(c.getPropertyId()).ifPresent(p -> applyProperty(p, b));
        }
        resolveLinkedContract(c).ifPresent(lc -> {
            b.contractId(lc.getId());
            b.contractNumber(lc.getContractNumber());
            b.contractStatus(lc.getStatus() != null ? lc.getStatus().name() : null);
        });
    }

    private void enrichContext(TenantComplaint c, ComplaintListItemResponse.ComplaintListItemResponseBuilder b) {
        if (c.getTenantId() != null) {
            tenantRepository.findById(c.getTenantId()).ifPresent(t -> applyTenant(t, b));
        }
        if (c.getUnitId() != null) {
            unitRepository.findById(c.getUnitId()).ifPresent(u -> b.unitNumber(u.getUnitNumber()));
        }
        if (c.getPropertyId() != null) {
            propertyRepository.findById(c.getPropertyId()).ifPresent(p -> applyProperty(p, b));
        }
        resolveLinkedContract(c).ifPresent(lc -> {
            b.contractId(lc.getId());
            b.contractNumber(lc.getContractNumber());
            b.contractStatus(lc.getStatus() != null ? lc.getStatus().name() : null);
        });
    }

    private void applyTenant(Tenant tenant, ComplaintResponse.ComplaintResponseBuilder b) {
        b.tenantName(tenant.getFullName());
        b.tenantNameAr(tenant.getFullNameAr());
        b.tenantNameEn(tenant.getFullNameEn());
    }

    private void applyTenant(Tenant tenant, ComplaintListItemResponse.ComplaintListItemResponseBuilder b) {
        b.tenantName(tenant.getFullName());
        b.tenantNameAr(tenant.getFullNameAr());
        b.tenantNameEn(tenant.getFullNameEn());
    }

    private void applyProperty(Property property, ComplaintResponse.ComplaintResponseBuilder b) {
        b.propertyName(property.getPropertyName());
        b.propertyNameAr(property.getPropertyNameAr());
        b.propertyNameEn(property.getPropertyNameEn());
    }

    private void applyProperty(Property property, ComplaintListItemResponse.ComplaintListItemResponseBuilder b) {
        b.propertyName(property.getPropertyName());
        b.propertyNameAr(property.getPropertyNameAr());
        b.propertyNameEn(property.getPropertyNameEn());
    }

    private Optional<LeaseContract> resolveLinkedContract(TenantComplaint c) {
        if (c.getTenantId() == null) {
            return Optional.empty();
        }
        List<LeaseContract> contracts = leaseContractRepository.findByTenantIdOrderByCreatedAtDesc(c.getTenantId());
        if (c.getUnitId() != null) {
            Optional<LeaseContract> activeForUnit = contracts.stream()
                    .filter(lc -> c.getUnitId().equals(lc.getUnitId()))
                    .filter(lc -> lc.getStatus() == ContractStatus.ACTIVE)
                    .findFirst();
            if (activeForUnit.isPresent()) {
                return activeForUnit;
            }
            return contracts.stream()
                    .filter(lc -> c.getUnitId().equals(lc.getUnitId()))
                    .findFirst();
        }
        return leaseContractRepository.findFirstByTenantIdAndStatusOrderByStartDateDesc(
                c.getTenantId(), ContractStatus.ACTIVE);
    }

    private List<Long> adminUserIds(Long propertyId) {
        List<User> superAdmins = userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN);
        List<User> managers = userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER);
        List<User> accountants = userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT);
        return Stream.of(superAdmins, managers, accountants)
                .flatMap(List::stream)
                .map(User::getId)
                .distinct()
                .collect(Collectors.toList());
    }

    private void notifyAdminAudience(Long propertyId, NotificationType type,
                                     String titleKey, String bodyKey,
                                     Map<String, Object> vars) {
        List<Long> ownerIds = propertyOwnerPortalRecipientService.portalRecipientUserIds(propertyId);
        List<Long> adminIds = adminUserIds(propertyId);
        List<Long> recipients = Stream.of(ownerIds, adminIds)
                .flatMap(List::stream).distinct().collect(Collectors.toList());
        if (recipients.isEmpty()) return;
        notificationService.createLocalized(
                recipients, null, propertyId, null,
                type, titleKey, bodyKey, vars, null);
    }

}
