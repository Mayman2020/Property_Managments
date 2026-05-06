package com.propertymanagement.modules.owner;

import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.owner.dto.LinkUserRequest;
import com.propertymanagement.modules.owner.dto.OwnerRequest;
import com.propertymanagement.modules.owner.dto.OwnerResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import com.propertymanagement.shared.i18n.BilingualNotificationText;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OwnerService {
    private static final String DEFAULT_SYSTEM_PASSWORD = "1234";

    private final OwnerRepository ownerRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AppMessages appMessages;

    public Page<OwnerResponse> getAll(Pageable pageable) {
        return ownerRepository.findByActiveTrue(pageable).map(this::toResponse);
    }

    public OwnerResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public OwnerResponse create(OwnerRequest request) {
        if (request.getNationalId() != null && ownerRepository.existsByNationalId(request.getNationalId())) {
            throw AppException.conflict("National ID already registered: " + request.getNationalId());
        }
        String ar = request.getFullNameAr().trim();
        String en = request.getFullNameEn().trim();
        Owner owner = Owner.builder()
                .fullNameAr(ar)
                .fullNameEn(en)
                .fullName(ownerCompositeLine(ar, en))
                .nationalId(request.getNationalId())
                .phone(request.getPhone())
                .email(trimEmail(request.getEmail()))
                .profileImageUrl(request.getProfileImageUrl())
                .civilIdImageUrl(request.getCivilIdImageUrl())
                .address(request.getAddress())
                .notes(request.getNotes())
                .active(true)
                .build();

        String email = trimEmail(request.getEmail());
        if (email != null) {
            User user = ensureOwnerPortalUser(email, ownerCompositeLine(ar, en), request.getPhone(), null);
            syncPortalUserFromOwnerProfile(user, request);
            owner.setUserId(user.getId());
            owner.setPortalAccess(true);
        }

        Owner saved = ownerRepository.save(owner);
        if (saved.getUserId() != null && saved.isPortalAccess()) {
            notifyOwnerPortalLinked(saved);
        }
        return toResponse(saved);
    }

    @Transactional
    public OwnerResponse update(Long id, OwnerRequest request) {
        Owner owner = findActive(id);
        Long previousUserId = owner.getUserId();
        String ar = request.getFullNameAr().trim();
        String en = request.getFullNameEn().trim();
        owner.setFullNameAr(ar);
        owner.setFullNameEn(en);
        owner.setFullName(ownerCompositeLine(ar, en));
        owner.setPhone(request.getPhone());
        owner.setProfileImageUrl(request.getProfileImageUrl());
        owner.setCivilIdImageUrl(request.getCivilIdImageUrl());
        owner.setAddress(request.getAddress());
        owner.setNotes(request.getNotes());

        String email = trimEmail(request.getEmail());
        if (owner.getUserId() == null && email != null) {
            String name = ownerCompositeLine(ar, en);
            String phone = firstNonBlank(request.getPhone(), owner.getPhone());
            User user = ensureOwnerPortalUser(email, name, phone, owner.getId());
            owner.setUserId(user.getId());
            owner.setPortalAccess(true);
        }
        owner.setEmail(email);

        Owner saved = ownerRepository.save(owner);
        if (saved.getUserId() != null) {
            userRepository.findById(saved.getUserId()).ifPresent(u -> syncPortalUserFromOwnerProfile(u, request));
        }
        if (saved.getUserId() != null && saved.isPortalAccess() && previousUserId == null) {
            notifyOwnerPortalLinked(saved);
        }
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Owner owner = findActive(id);
        Long portalUserId = owner.getUserId();
        owner.setActive(false);
        owner.setUserId(null);
        owner.setPortalAccess(false);
        ownerRepository.save(owner);
        if (portalUserId != null) {
            userService.delete(portalUserId);
        }
    }

    @Transactional
    public OwnerResponse linkUser(Long id, LinkUserRequest request) {
        Owner owner = findActive(id);
        Long previousUserId = owner.getUserId();
        boolean previousPortal = owner.isPortalAccess();
        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> AppException.notFound("User not found: " + request.getUserId()));
            if (user.getRole() != UserRole.OWNER) {
                throw AppException.badRequest("User must have role OWNER to be linked to an owner record");
            }
            owner.setUserId(user.getId());
        } else {
            owner.setUserId(null);
        }
        owner.setPortalAccess(request.isPortalAccess());
        Owner saved = ownerRepository.save(owner);
        if (saved.getUserId() != null) {
            userRepository.findById(saved.getUserId()).ifPresent(u -> {
                OwnerRequest r = new OwnerRequest();
                r.setProfileImageUrl(saved.getProfileImageUrl());
                r.setPhone(saved.getPhone());
                syncPortalUserFromOwnerProfile(u, r);
            });
        }
        if (saved.getUserId() != null && saved.isPortalAccess()
                && (previousUserId == null || !previousUserId.equals(saved.getUserId()) || !previousPortal)) {
            notifyOwnerPortalLinked(saved);
        }
        return toResponse(saved);
    }

    /** In-app welcome: lists linked properties so the owner knows they will receive operational alerts. */
    private void notifyOwnerPortalLinked(Owner owner) {
        if (owner.getUserId() == null) {
            return;
        }
        List<String> labels = ownerRepository.findActivePropertyLabelsForOwner(owner.getId());
        String sepAr = appMessages.get(AppMessages.LOCALE_AR, "format.property_list.separator");
        String sepEn = appMessages.get(AppMessages.LOCALE_EN, "format.property_list.separator");
        String joined = (labels == null || labels.isEmpty()) ? "" : String.join(sepAr, labels);
        String joinedEn = (labels == null || labels.isEmpty()) ? "" : String.join(sepEn, labels);
        AppMessages.Bilingual titleB = appMessages.bilingual("owner.portal.notify.title");
        String title = BilingualNotificationText.title(titleB.ar(), titleB.en());
        String bodyAr;
        String bodyEn;
        if (labels == null || labels.isEmpty()) {
            AppMessages.Bilingual bodyB = appMessages.bilingual("owner.portal.notify.body.no_properties");
            bodyAr = bodyB.ar();
            bodyEn = bodyB.en();
        } else {
            bodyAr = appMessages.get(AppMessages.LOCALE_AR, "owner.portal.notify.body.with_properties", joined);
            bodyEn = appMessages.get(AppMessages.LOCALE_EN, "owner.portal.notify.body.with_properties", joinedEn);
        }
        notificationService.createForRecipients(
                List.of(owner.getUserId()),
                null,
                null,
                null,
                NotificationType.GENERAL,
                title,
                BilingualNotificationText.body(bodyAr, bodyEn)
        );
    }

    private static String ownerCompositeLine(String ar, String en) {
        String a = ar == null ? "" : ar.trim();
        String e = en == null ? "" : en.trim();
        if (a.isEmpty()) return e;
        if (e.isEmpty()) return a;
        if (a.equals(e)) return a;
        return a + " / " + e;
    }

    private static String trimEmail(String raw) {
        if (raw == null) return null;
        String t = raw.trim();
        return t.isEmpty() ? null : t;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }

    /**
     * Creates or reuses an OWNER user for portal login. Refuses non-owner emails already in use.
     * Ensures the user is not already linked to a different owner record.
     */
    private User ensureOwnerPortalUser(String email, String fullName, String phone, Long currentOwnerIdOrNull) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getRole() != UserRole.OWNER) {
                throw AppException.conflict("Email already registered to a non-owner account: " + email, "EMAIL_USED_BY_DIFFERENT_ROLE");
            }
            assertPortalUserNotLinkedToOtherOwner(u.getId(), currentOwnerIdOrNull);
            return u;
        }
        return userRepository.save(User.builder()
                .username(email)
                .email(email)
                .password(passwordEncoder.encode(DEFAULT_SYSTEM_PASSWORD))
                .fullName(fullName)
                .phone(phone)
                .role(UserRole.OWNER)
                .active(true)
                .build());
    }

    /** Copy owner media onto the portal user so login / {@code /users/me} show the same photo. */
    private void syncPortalUserFromOwnerProfile(User user, OwnerRequest request) {
        boolean dirty = false;
        if (request.getProfileImageUrl() != null && !request.getProfileImageUrl().isBlank()) {
            user.setProfileImageUrl(request.getProfileImageUrl().trim());
            dirty = true;
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()
                && (user.getPhone() == null || user.getPhone().isBlank())) {
            user.setPhone(request.getPhone().trim());
            dirty = true;
        }
        if (dirty) {
            userRepository.save(user);
        }
    }

    private void assertPortalUserNotLinkedToOtherOwner(Long userId, Long currentOwnerIdOrNull) {
        ownerRepository.findByUserId(userId).ifPresent(other -> {
            if (currentOwnerIdOrNull == null || !other.getId().equals(currentOwnerIdOrNull)) {
                throw AppException.conflict("This portal account is already linked to another owner");
            }
        });
    }

    private Owner findActive(Long id) {
        return ownerRepository.findById(id)
                .filter(Owner::isActive)
                .orElseThrow(() -> AppException.notFound("Owner not found: " + id));
    }

    private boolean resolveLinkedUserActive(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.findById(userId).map(User::isActive).orElse(false);
    }

    private OwnerResponse toResponse(Owner o) {
        return OwnerResponse.builder()
                .id(o.getId())
                .fullName(o.getFullName())
                .fullNameAr(o.getFullNameAr())
                .fullNameEn(o.getFullNameEn())
                .nationalId(o.getNationalId())
                .phone(o.getPhone())
                .email(o.getEmail())
                .profileImageUrl(o.getProfileImageUrl())
                .civilIdImageUrl(o.getCivilIdImageUrl())
                .address(o.getAddress())
                .notes(o.getNotes())
                .active(o.isActive())
                .userId(o.getUserId())
                .linkedUserActive(resolveLinkedUserActive(o.getUserId()))
                .portalAccess(o.isPortalAccess())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .createdBy(o.getCreatedBy())
                .createdByName(resolveUserName(o.getCreatedBy()))
                .modifiedBy(o.getModifiedBy())
                .modifiedByName(resolveUserName(o.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }
}
