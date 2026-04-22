package com.propertymanagement.modules.maintenance.rating;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VisitRatingRepository extends JpaRepository<VisitRating, Long> {
    Optional<VisitRating> findByRequestId(Long requestId);
    boolean existsByRequestId(Long requestId);

    @Query("SELECT AVG(r.rating) FROM VisitRating r")
    Double getAverageRating();

    @Query("SELECT COUNT(r) FROM VisitRating r")
    long countAll();

    @Query("SELECT COUNT(r) FROM VisitRating r WHERE r.rating = :rating")
    long countByRating(@Param("rating") Short rating);
}
