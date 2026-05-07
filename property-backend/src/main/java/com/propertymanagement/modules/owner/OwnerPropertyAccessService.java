package com.propertymanagement.modules.owner;

import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Resolves which properties an {@link UserRole#OWNER} user may read (primary {@code properties.owner_id}
 * plus {@code property_owners}). Non-owners: {@code null} means no owner-scoped restriction.
 */
@Service
@RequiredArgsConstructor
public class OwnerPropertyAccessService {

    private final OwnerRepository ownerRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyScopeService propertyScopeService;

    /**
     * @return {@code null} for unrestricted roles (SUPER_ADMIN/GENERAL_MANAGER by active role),
     * otherwise the effective scoped property ids (possibly empty).
     */
    public Set<Long> ownerPropertyIdsOrNullIfNotOwner() {
        return propertyScopeService.propertyIdsOrNullIfUnrestricted();
    }

    public void assertOwnerCanAccessProperty(Long propertyId) {
        Set<Long> scope = ownerPropertyIdsOrNullIfNotOwner();
        if (scope == null) {
            return;
        }
        if (propertyId == null || !scope.contains(propertyId)) {
            throw AppException.forbidden("You do not have access to this property");
        }
    }

    public void assertOwnerCanAccessProperty(Property property) {
        if (property == null) {
            return;
        }
        assertOwnerCanAccessProperty(property.getId());
    }

    /** Blocks mutating operations when the current user is an owner (read-only staff screens). */
    public void denyOwnerMutation(String message) {
        if (currentUser().map(u -> u.getRole() == UserRole.OWNER).orElse(false)) {
            throw AppException.forbidden(message);
        }
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
}
