package com.propertymanagement.modules.maintenance.rating.service;

import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.rating.entity.VisitRating;
import com.propertymanagement.modules.maintenance.rating.repository.VisitRatingRepository;
import com.propertymanagement.modules.maintenance.rating.dto.VisitRatingRequest;
import com.propertymanagement.modules.maintenance.rating.dto.VisitRatingResponse;
import com.propertymanagement.modules.maintenance.rating.dto.RatingDashboardItemResponse;
import com.propertymanagement.modules.maintenance.rating.dto.RatingsSummaryResponse;
import com.propertymanagement.modules.tenant.entity.Tenant;

@Service
@RequiredArgsConstructor
public class VisitRatingService {

    private final VisitRatingRepository ratingRepository;
    private final MaintenanceRequestRepository requestRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;

    @Transactional
    public VisitRatingResponse submitRating(Long requestId, VisitRatingRequest dto) {
        MaintenanceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> AppException.notFound("Request not found: " + requestId));

        if (!EnumSet.of(RequestStatus.COMPLETED, RequestStatus.NEEDS_REVISIT).contains(request.getStatus())) {
            throw AppException.badRequest("Rating can only be submitted for COMPLETED or NEEDS_REVISIT requests");
        }
        if (ratingRepository.existsByRequestId(requestId)) {
            throw AppException.conflict("Rating already submitted for request: " + requestId);
        }

        Long tenantUserId = currentUserId();
        Long tenantId = request.getTenantId();

        VisitRating rating = VisitRating.builder()
                .requestId(requestId)
                .tenantId(tenantId)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();
        VisitRating saved = ratingRepository.save(rating);
        notifyRatingSubmitted(request);
        return toResponse(saved);
    }

    public VisitRatingResponse getRating(Long requestId) {
        return ratingRepository.findByRequestId(requestId)
                .map(this::toResponse)
                .orElseThrow(() -> AppException.notFound("Rating not found for request: " + requestId));
    }

    public RatingsSummaryResponse getSummary() {
        Double avg = ratingRepository.getAverageRating();
        long total = ratingRepository.countAll();
        long[] breakdown = new long[5];
        for (int i = 1; i <= 5; i++) {
            breakdown[i - 1] = ratingRepository.countByRating((short) i);
        }
        return RatingsSummaryResponse.builder()
                .averageRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0)
                .totalRatings(total)
                .oneStar(breakdown[0])
                .twoStar(breakdown[1])
                .threeStar(breakdown[2])
                .fourStar(breakdown[3])
                .fiveStar(breakdown[4])
                .build();
    }

    public List<RatingDashboardItemResponse> getDashboardDetails() {
        return ratingRepository.findDashboardDetails().stream()
                .peek(item -> item.setPropertyName(
                        LocalizedNameResolver.resolve(item.getPropertyNameAr(), item.getPropertyNameEn(), item.getPropertyName())
                ))
                .toList();
    }

    private void notifyRatingSubmitted(MaintenanceRequest request) {
        VisitRating rating = ratingRepository.findByRequestId(request.getId()).orElse(null);
        String scaleLabel = ratingScaleLabel(rating != null ? rating.getRating() : null);
        String comment = rating != null && rating.getComment() != null && !rating.getComment().isBlank()
                ? rating.getComment().trim()
                : "-";
        List<Long> recipients = new ArrayList<>();
        if (request.getPropertyId() != null) {
            recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(request.getPropertyId()));
            recipients.addAll(propertyAccountantIds(request.getPropertyId()));
        }
        if (request.getContractorCompanyId() != null && request.getPropertyId() != null) {
            recipients.addAll(contractorStaffIds(request.getContractorCompanyId(), request.getPropertyId()));
        }
        recipients = recipients.stream().distinct().collect(Collectors.toList());
        if (recipients.isEmpty()) return;
        notificationService.createForRecipients(
                recipients, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_RATED,
                "Tenant submitted a rating",
                "Request " + request.getRequestNumber() + " was rated: " + scaleLabel + ". Comment: " + comment
        );
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private VisitRatingResponse toResponse(VisitRating r) {
        return VisitRatingResponse.builder()
                .id(r.getId())
                .requestId(r.getRequestId())
                .rating(r.getRating())
                .ratingLabel(ratingScaleLabel(r.getRating()))
                .ratingIcon(ratingScaleIcon(r.getRating()))
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private List<Long> propertyAccountantIds(Long propertyId) {
        List<Long> ids = new ArrayList<>(userRepository.findByRoleAndActiveTrue(UserRole.ACCOUNTANT)
                .stream()
                .filter(u -> u.getPropertyId() == null || u.getPropertyId().equals(propertyId))
                .map(User::getId)
                .toList());
        ids.addAll(userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN)
                .stream().map(User::getId).toList());
        return ids.stream().distinct().toList();
    }

    private List<Long> contractorStaffIds(Long companyId, Long propertyId) {
        return userRepository.findActiveContractorStaffForProperty(propertyId, companyId).stream()
                .map(User::getId)
                .toList();
    }

    private String ratingScaleLabel(Short rating) {
        if (rating == null) return "Unknown";
        return switch (rating) {
            case 4 -> "Very Satisfied";
            case 3 -> "Satisfied";
            case 2 -> "Unsatisfied";
            case 1 -> "Very Unsatisfied";
            default -> "Unknown";
        };
    }

    private String ratingScaleIcon(Short rating) {
        if (rating == null) return "sentiment_neutral";
        return switch (rating) {
            case 4 -> "sentiment_very_satisfied";
            case 3 -> "sentiment_satisfied";
            case 2 -> "sentiment_dissatisfied";
            case 1 -> "sentiment_very_dissatisfied";
            default -> "sentiment_neutral";
        };
    }
}
