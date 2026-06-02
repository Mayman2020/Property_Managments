package com.propertymanagement.modules.maintenance.rating.service;

import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
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
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import com.propertymanagement.modules.maintenance.rating.entity.VisitRating;
import com.propertymanagement.modules.maintenance.rating.repository.VisitRatingRepository;
import com.propertymanagement.modules.maintenance.rating.dto.VisitRatingRequest;
import com.propertymanagement.modules.maintenance.rating.dto.VisitRatingResponse;
import com.propertymanagement.modules.maintenance.rating.dto.RatingDashboardItemResponse;
import com.propertymanagement.modules.maintenance.rating.dto.RatingsSummaryResponse;

@Service
@RequiredArgsConstructor
public class VisitRatingService {

    private final VisitRatingRepository ratingRepository;
    private final MaintenanceRequestRepository requestRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
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
        long[] breakdown = new long[4];
        for (int i = 1; i <= 4; i++) {
            breakdown[i - 1] = ratingRepository.countByRating((short) i);
        }
        long legacyFiveStar = ratingRepository.countByRating((short) 5);
        return RatingsSummaryResponse.builder()
                .averageRating(avg != null ? Math.min(4.0, Math.round(avg * 10.0) / 10.0) : 0.0)
                .totalRatings(total)
                .oneStar(breakdown[0])
                .twoStar(breakdown[1])
                .threeStar(breakdown[2])
                .fourStar(breakdown[3] + legacyFiveStar)
                .build();
    }

    public List<RatingDashboardItemResponse> getDashboardDetails(Set<Long> allowedPropertyIds) {
        List<RatingDashboardItemResponse> items;
        if (allowedPropertyIds == null) {
            items = ratingRepository.findDashboardDetails();
        } else if (allowedPropertyIds.isEmpty()) {
            return List.of();
        } else {
            items = ratingRepository.findDashboardDetailsByPropertyIds(allowedPropertyIds);
        }
        return items.stream()
                .peek(item -> item.setRating(normalizeRating(item.getRating())))
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
            recipients.addAll(adminAndAccountantIds(request.getPropertyId()));
        }
        recipients = recipients.stream().distinct().collect(Collectors.toList());
        if (recipients.isEmpty()) return;
        notificationService.createForRecipients(
                recipients, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_RATED,
                "تقييم زيارة صيانة",
                "قام المستأجر بتقييم طلب " + request.getRequestNumber() + ": " + scaleLabel + ". ملاحظة: " + comment
        );
    }

    private List<Long> adminAndAccountantIds(Long propertyId) {
        List<User> superAdmins = userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN);
        List<User> managers = userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER);
        List<User> accountants = userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT);
        return Stream.of(superAdmins, managers, accountants)
                .flatMap(List::stream)
                .map(User::getId)
                .distinct()
                .collect(Collectors.toList());
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
                .rating(normalizeRating(r.getRating()))
                .ratingLabel(ratingScaleLabel(normalizeRating(r.getRating())))
                .ratingIcon(ratingScaleIcon(normalizeRating(r.getRating())))
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
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

    private Short normalizeRating(Short rating) {
        if (rating == null) return null;
        if (rating < 1) return 1;
        if (rating > 4) return 4;
        return rating;
    }
}
