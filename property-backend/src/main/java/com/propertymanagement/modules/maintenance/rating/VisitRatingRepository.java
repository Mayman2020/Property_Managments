package com.propertymanagement.modules.maintenance.rating;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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

    @Query("""
            SELECT new com.propertymanagement.modules.maintenance.rating.RatingDashboardItemResponse(
                r.id,
                r.requestId,
                r.rating,
                r.comment,
                r.createdAt,
                mr.requestNumber,
                mr.title,
                mr.propertyId,
                p.propertyName,
                p.propertyNameAr,
                p.propertyNameEn,
                mr.unitId,
                u.unitNumber,
                t.fullName
            )
            FROM VisitRating r
            JOIN MaintenanceRequest mr ON mr.id = r.requestId
            LEFT JOIN Property p ON p.id = mr.propertyId
            LEFT JOIN Unit u ON u.id = mr.unitId
            LEFT JOIN Tenant t ON t.id = mr.tenantId
            ORDER BY r.createdAt DESC
            """)
    List<RatingDashboardItemResponse> findDashboardDetails();
}
