package com.propertymanagement.modules.maintenance.rating;

import com.propertymanagement.modules.maintenance.request.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.maintenance.request.RequestStatus;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
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

@Service
@RequiredArgsConstructor
public class VisitRatingService {

    private final VisitRatingRepository ratingRepository;
    private final MaintenanceRequestRepository requestRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

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
        List<Long> admins = new ArrayList<>(userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN)
                .stream().map(User::getId).collect(Collectors.toList()));
        if (request.getPropertyId() != null) {
            userRepository.findByPropertyIdAndRoleAndActiveTrue(request.getPropertyId(), UserRole.PROPERTY_ADMIN)
                    .stream().map(User::getId).forEach(admins::add);
        }
        if (admins.isEmpty()) return;
        notificationService.createForRecipients(
                admins, currentUserId(), request.getPropertyId(), request.getId(),
                NotificationType.REQUEST_RATED,
                "Tenant submitted a rating",
                "A rating was submitted for request " + request.getRequestNumber()
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
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
