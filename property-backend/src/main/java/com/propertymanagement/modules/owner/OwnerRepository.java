package com.propertymanagement.modules.owner;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OwnerRepository extends JpaRepository<Owner, Long> {
    Page<Owner> findByActiveTrue(Pageable pageable);
    boolean existsByNationalId(String nationalId);

    /** True if another row (different id) already uses this national ID. */
    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Owner o WHERE o.nationalId = :nid AND o.id <> :excludeId")
    boolean existsByNationalIdAndIdNot(@Param("nid") String nationalId, @Param("excludeId") Long excludeId);

    Optional<Owner> findByUserId(Long userId);
}
