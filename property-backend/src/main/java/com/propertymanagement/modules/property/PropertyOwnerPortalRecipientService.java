package com.propertymanagement.modules.property;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Resolves portal user IDs for all active owners linked to a property (multi-owner via
 * {@code property_owners} plus legacy {@code properties.owner_id}). Used so property owners
 * receive the same operational notifications as staff where appropriate.
 */
@Service
@RequiredArgsConstructor
public class PropertyOwnerPortalRecipientService {

    private final EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public List<Long> portalRecipientUserIds(Long propertyId) {
        if (propertyId == null) {
            return List.of();
        }
        List<?> rows = entityManager.createNativeQuery("""
                        SELECT DISTINCT uid
                        FROM (
                                 SELECT o.user_id AS uid
                                 FROM property_mgmt.property_owners po
                                          INNER JOIN property_mgmt.owners o ON o.id = po.owner_id
                                 WHERE po.property_id = ?1
                                   AND o.user_id IS NOT NULL
                                   AND o.is_active = TRUE
                                   AND o.portal_access = TRUE
                                 UNION
                                 SELECT o.user_id AS uid
                                 FROM property_mgmt.properties p
                                          INNER JOIN property_mgmt.owners o ON o.id = p.owner_id
                                 WHERE p.id = ?1
                                   AND p.owner_id IS NOT NULL
                                   AND o.user_id IS NOT NULL
                                   AND o.is_active = TRUE
                                   AND o.portal_access = TRUE
                             ) t
                        WHERE uid IS NOT NULL
                        """)
                .setParameter(1, propertyId)
                .getResultList();
        Set<Long> out = new LinkedHashSet<>();
        for (Object row : rows) {
            if (row instanceof Number n) {
                out.add(n.longValue());
            }
        }
        return List.copyOf(out);
    }
}
