package com.propertymanagement.modules.property;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    Page<Property> findByActiveTrue(Pageable pageable);
    boolean existsByPropertyCode(String code);
    Optional<Property> findByPropertyCode(String code);

    @Query("SELECT COUNT(p) FROM Property p WHERE p.active = true")
    long countActive();
}
