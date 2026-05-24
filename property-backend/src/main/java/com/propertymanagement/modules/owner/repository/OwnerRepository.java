package com.propertymanagement.modules.owner.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.propertymanagement.modules.owner.entity.Owner;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.property.entity.Property;

@Repository
public interface OwnerRepository extends JpaRepository<Owner, Long> {
    Page<Owner> findByActiveTrue(Pageable pageable);

    @Query(value = """
            SELECT DISTINCT o.*
            FROM property_mgmt.owners o
                     LEFT JOIN property_mgmt.properties p_primary
                               ON p_primary.owner_id = o.id
                              AND p_primary.is_active = TRUE
                     LEFT JOIN property_mgmt.property_owners po
                               ON po.owner_id = o.id
                     LEFT JOIN property_mgmt.properties p_co
                               ON p_co.id = po.property_id
                              AND p_co.is_active = TRUE
            WHERE o.is_active = TRUE
              AND (
                p_primary.id IN (:propertyIds)
                OR p_co.id IN (:propertyIds)
              )
            """,
            countQuery = """
            SELECT COUNT(DISTINCT o.id)
            FROM property_mgmt.owners o
                     LEFT JOIN property_mgmt.properties p_primary
                               ON p_primary.owner_id = o.id
                              AND p_primary.is_active = TRUE
                     LEFT JOIN property_mgmt.property_owners po
                               ON po.owner_id = o.id
                     LEFT JOIN property_mgmt.properties p_co
                               ON p_co.id = po.property_id
                              AND p_co.is_active = TRUE
            WHERE o.is_active = TRUE
              AND (
                p_primary.id IN (:propertyIds)
                OR p_co.id IN (:propertyIds)
              )
            """,
            nativeQuery = true)
    Page<Owner> findActiveLinkedToPropertyIds(@Param("propertyIds") Collection<Long> propertyIds, Pageable pageable);

    @Query(value = """
            SELECT DISTINCT o.*
            FROM property_mgmt.owners o
                     LEFT JOIN property_mgmt.properties p_primary
                               ON p_primary.owner_id = o.id
                              AND p_primary.is_active = TRUE
                     LEFT JOIN property_mgmt.property_owners po
                               ON po.owner_id = o.id
                     LEFT JOIN property_mgmt.properties p_co
                               ON p_co.id = po.property_id
                              AND p_co.is_active = TRUE
            WHERE o.is_active = TRUE
              AND (
                p_primary.id = :propertyId
                OR p_co.id = :propertyId
              )
            """,
            countQuery = """
            SELECT COUNT(DISTINCT o.id)
            FROM property_mgmt.owners o
                     LEFT JOIN property_mgmt.properties p_primary
                               ON p_primary.owner_id = o.id
                              AND p_primary.is_active = TRUE
                     LEFT JOIN property_mgmt.property_owners po
                               ON po.owner_id = o.id
                     LEFT JOIN property_mgmt.properties p_co
                               ON p_co.id = po.property_id
                              AND p_co.is_active = TRUE
            WHERE o.is_active = TRUE
              AND (
                p_primary.id = :propertyId
                OR p_co.id = :propertyId
              )
            """,
            nativeQuery = true)
    Page<Owner> findActiveLinkedToPropertyId(@Param("propertyId") Long propertyId, Pageable pageable);
    boolean existsByNationalId(String nationalId);

    /** True if another row (different id) already uses this national ID. */
    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Owner o WHERE o.nationalId = :nid AND o.id <> :excludeId")
    boolean existsByNationalIdAndIdNot(@Param("nid") String nationalId, @Param("excludeId") Long excludeId);

    /** QA and co-owner flows may link the same portal user to multiple owner rows; pick the latest. */
    Optional<Owner> findTopByUserIdOrderByIdDesc(Long userId);

    List<Owner> findAllByUserIdAndActiveTrueOrderByIdDesc(Long userId);

    default Optional<Owner> findByUserId(Long userId) {
        return findTopByUserIdOrderByIdDesc(userId);
    }

    /** Portal login users to notify when {@code ownerIds} are attached to a property (active + portal access). */
    @Query("SELECT o.userId FROM Owner o WHERE o.id IN :ownerIds AND o.active = true AND o.portalAccess = true AND o.userId IS NOT NULL")
    List<Long> findPortalUserIdsByOwnerIds(@Param("ownerIds") Collection<Long> ownerIds);

    /** Active properties where this owner appears in {@code property_owners} or as legacy {@code properties.owner_id}. */
    @Query(value = """
            SELECT label FROM (
                SELECT COALESCE(NULLIF(TRIM(p.property_name_ar), ''), NULLIF(TRIM(p.property_name_en), ''),
                               NULLIF(TRIM(p.property_name), ''), p.property_code) AS label,
                       p.id AS sid
                FROM property_mgmt.properties p
                         INNER JOIN property_mgmt.property_owners po ON po.property_id = p.id
                WHERE po.owner_id = :ownerId
                  AND p.is_active = TRUE
                UNION
                SELECT COALESCE(NULLIF(TRIM(p.property_name_ar), ''), NULLIF(TRIM(p.property_name_en), ''),
                               NULLIF(TRIM(p.property_name), ''), p.property_code),
                       p.id
                FROM property_mgmt.properties p
                WHERE p.owner_id = :ownerId
                  AND p.is_active = TRUE
            ) u
            ORDER BY sid
            """, nativeQuery = true)
    List<String> findActivePropertyLabelsForOwner(@Param("ownerId") Long ownerId);

    @Query(value = """
            SELECT id FROM (
                SELECT p.id
                FROM property_mgmt.properties p
                         INNER JOIN property_mgmt.property_owners po ON po.property_id = p.id
                WHERE po.owner_id = :ownerId
                  AND p.is_active = TRUE
                UNION
                SELECT p.id
                FROM property_mgmt.properties p
                WHERE p.owner_id = :ownerId
                  AND p.is_active = TRUE
            ) u
            """, nativeQuery = true)
    List<Long> findActivePropertyIdsForOwner(@Param("ownerId") Long ownerId);

    /**
     * Returns IDs of active properties that would be left with NO owner after removing this owner.
     * Blocks deletion when any such property exists.
     */
    @Query(value = """
            SELECT p.id
            FROM property_mgmt.properties p
            WHERE p.is_active = TRUE
              AND (
                p.id IN (SELECT po.property_id FROM property_mgmt.property_owners po WHERE po.owner_id = :ownerId)
                OR p.owner_id = :ownerId
              )
              AND (
                (SELECT COUNT(*) FROM property_mgmt.property_owners po2
                  WHERE po2.property_id = p.id AND po2.owner_id <> :ownerId) = 0
                AND (p.owner_id IS NULL OR p.owner_id = :ownerId)
              )
            """, nativeQuery = true)
    List<Long> findPropertyIdsWhereSoleOwner(@Param("ownerId") Long ownerId);
}
