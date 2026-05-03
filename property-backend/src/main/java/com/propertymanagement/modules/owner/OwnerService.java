package com.propertymanagement.modules.owner;

import com.propertymanagement.modules.owner.dto.LinkUserRequest;
import com.propertymanagement.modules.owner.dto.OwnerRequest;
import com.propertymanagement.modules.owner.dto.OwnerResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OwnerService {

    private final OwnerRepository ownerRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

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

        return toResponse(ownerRepository.save(owner));
    }

    @Transactional
    public OwnerResponse update(Long id, OwnerRequest request) {
        Owner owner = findActive(id);
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
        return toResponse(saved);
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
                throw AppException.conflict("Email already registered to a non-owner account: " + email);
            }
            assertPortalUserNotLinkedToOtherOwner(u.getId(), currentOwnerIdOrNull);
            return u;
        }
        return userRepository.save(User.builder()
                .username(email)
                .email(email)
                .password(passwordEncoder.encode("12345"))
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
