package com.propertymanagement.shared.security;

import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserPropertyAccessRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class PropertyScopeService {

    public static final String ACTIVE_ROLE_HEADER = "X-Active-Role";
    public static final String SELECTED_PROPERTY_ID_HEADER = "X-Selected-Property-Id";

    private final OwnerRepository ownerRepository;
    private final PropertyRepository propertyRepository;
    private final UserPropertyAccessRepository userPropertyAccessRepository;

    /**
     * UI sends the role the user is currently acting as (multi-role accounts).
     * Must match one of {@link User#getAllAssignedRoles()} or it is ignored and primary {@link User#getRole()} is used.
     */
    public UserRole resolveEffectiveRole(User user) {
        Optional<String> header = readActiveRoleHeader();
        if (header.isPresent()) {
            try {
                UserRole parsed = UserRole.valueOf(header.get().trim().toUpperCase());
                if (user.getAllAssignedRoles().contains(parsed)) {
                    return parsed;
                }
            } catch (IllegalArgumentException ignored) {
                // fall through
            }
        }
        return user.getRole();
    }

    /**
     * Null means unrestricted for the <em>effective</em> active role (SUPER_ADMIN / GENERAL_MANAGER).
     * Otherwise a (possibly empty) set of property ids the user may access.
     */
    public Set<Long> propertyIdsOrNullIfUnrestricted() {
        Optional<User> optional = currentUser();
        if (optional.isEmpty()) {
            return Set.of();
        }
        User user = optional.get();
        UserRole effective = resolveEffectiveRole(user);
        if (isUnrestrictedRole(effective)) {
            return null;
        }
        Set<Long> scoped = computeScopedPropertyIds(user, effective);
        return enforceSingleScopedProperty(scoped);
    }

    public PropertyAccessSummary getMyPropertyAccessSummary() {
        Optional<User> optional = currentUser();
        if (optional.isEmpty()) {
            return new PropertyAccessSummary(false, List.of());
        }
        User user = optional.get();
        UserRole effective = resolveEffectiveRole(user);
        if (isUnrestrictedRole(effective)) {
            return new PropertyAccessSummary(true, List.of());
        }
        Set<Long> scope = computeScopedPropertyIds(user, effective);
        return new PropertyAccessSummary(false, scope.stream().sorted().toList());
    }

    public boolean canAccessProperty(Long propertyId) {
        Set<Long> scope = propertyIdsOrNullIfUnrestricted();
        return scope == null || (propertyId != null && scope.contains(propertyId));
    }

    private boolean isUnrestrictedRole(UserRole role) {
        return role == UserRole.SUPER_ADMIN || role == UserRole.GENERAL_MANAGER;
    }

    private Set<Long> computeScopedPropertyIds(User user, UserRole effective) {
        if (effective == UserRole.OWNER) {
            return ownerRepository.findByUserId(user.getId())
                    .map(o -> propertyIdsForOwnerRecord(o.getId()))
                    .orElseGet(Set::of);
        }
        List<Long> fromAccess = userPropertyAccessRepository.findPropertyIdsByUserId(user.getId());
        if (!fromAccess.isEmpty()) {
            return new HashSet<>(fromAccess);
        }
        if (user.getPropertyId() != null) {
            return Set.of(user.getPropertyId());
        }
        return Set.of();
    }

    /**
     * For scoped roles, keep one active property for all screens:
     * - if UI provided {@code X-Selected-Property-Id} and it's in scope, use it
     * - otherwise default to the first property id in scope
     */
    private Set<Long> enforceSingleScopedProperty(Set<Long> scope) {
        if (scope == null || scope.isEmpty()) {
            return scope == null ? null : Set.of();
        }
        Optional<Long> selected = readSelectedPropertyIdHeader();
        if (selected.isPresent() && scope.contains(selected.get())) {
            return Set.of(selected.get());
        }
        Long first = scope.stream().sorted().findFirst().orElse(null);
        return first == null ? Set.of() : Set.of(first);
    }

    private Set<Long> propertyIdsForOwnerRecord(Long ownerId) {
        Set<Long> ids = new HashSet<>(propertyRepository.findPropertyIdsByCoOwner(ownerId));
        propertyRepository.findByOwnerIdAndActiveTrue(ownerId).forEach(p -> ids.add(p.getId()));
        return ids;
    }

    private Optional<User> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    private Optional<String> readActiveRoleHeader() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return Optional.empty();
            }
            HttpServletRequest request = attrs.getRequest();
            String v = request.getHeader(ACTIVE_ROLE_HEADER);
            if (v == null || v.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(v.trim());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Optional<Long> readSelectedPropertyIdHeader() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return Optional.empty();
            }
            HttpServletRequest request = attrs.getRequest();
            String raw = request.getHeader(SELECTED_PROPERTY_ID_HEADER);
            if (raw == null || raw.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(raw.trim()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
