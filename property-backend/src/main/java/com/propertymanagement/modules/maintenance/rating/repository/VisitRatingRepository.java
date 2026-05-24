package com.propertymanagement.modules.maintenance.rating.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import com.propertymanagement.modules.maintenance.rating.entity.VisitRating;
import com.propertymanagement.modules.maintenance.rating.dto.RatingDashboardItemResponse;
import com.propertymanagement.modules.maintenance.category.entity.MaintenanceCategory;
import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.unit.entity.Unit;

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
            SELECT new com.propertymanagement.modules.maintenance.rating.dto.RatingDashboardItemResponse(
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
                t.fullName,
                t.fullNameAr,
                t.fullNameEn,
                mc.nameAr,
                mc.nameEn,
                mr.status,
                mr.contractorCompanyId
            )
            FROM VisitRating r
            JOIN MaintenanceRequest mr ON mr.id = r.requestId
            LEFT JOIN Property p ON p.id = mr.propertyId
            LEFT JOIN Unit u ON u.id = mr.unitId
            LEFT JOIN Tenant t ON t.id = mr.tenantId
            LEFT JOIN MaintenanceCategory mc ON mc.id = mr.categoryId
            ORDER BY r.createdAt DESC
            """)
    List<RatingDashboardItemResponse> findDashboardDetails();

    @Query("""
            SELECT new com.propertymanagement.modules.maintenance.rating.dto.RatingDashboardItemResponse(
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
                t.fullName,
                t.fullNameAr,
                t.fullNameEn,
                mc.nameAr,
                mc.nameEn,
                mr.status,
                mr.contractorCompanyId
            )
            FROM VisitRating r
            JOIN MaintenanceRequest mr ON mr.id = r.requestId
            LEFT JOIN Property p ON p.id = mr.propertyId
            LEFT JOIN Unit u ON u.id = mr.unitId
            LEFT JOIN Tenant t ON t.id = mr.tenantId
            LEFT JOIN MaintenanceCategory mc ON mc.id = mr.categoryId
            WHERE mr.propertyId IN :propertyIds
            ORDER BY r.createdAt DESC
            """)
    List<RatingDashboardItemResponse> findDashboardDetailsByPropertyIds(@Param("propertyIds") Set<Long> propertyIds);
}
