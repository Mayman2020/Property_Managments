package com.propertymanagement.modules.complaint.repository;

import com.propertymanagement.modules.complaint.entity.ComplaintRating;
import com.propertymanagement.modules.complaint.dto.ComplaintRatingDashboardItemResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ComplaintRatingRepository extends JpaRepository<ComplaintRating, Long> {
    Optional<ComplaintRating> findByComplaintId(Long complaintId);
    boolean existsByComplaintId(Long complaintId);
    long countByRating(String rating);

    @Query("""
            SELECT new com.propertymanagement.modules.complaint.dto.ComplaintRatingDashboardItemResponse(
                r.id,
                r.complaintId,
                r.rating,
                r.raterRole,
                r.ratedAt,
                c.title,
                c.complaintType,
                c.status,
                c.priority,
                c.propertyId,
                p.propertyName,
                p.propertyNameAr,
                p.propertyNameEn,
                c.unitId,
                u.unitNumber,
                t.fullName,
                t.fullNameAr,
                t.fullNameEn,
                t.id,
                t.nationalId
            )
            FROM ComplaintRating r
            JOIN TenantComplaint c ON c.id = r.complaintId
            LEFT JOIN Property p ON p.id = c.propertyId
            LEFT JOIN Unit u ON u.id = c.unitId
            LEFT JOIN Tenant t ON t.id = c.tenantId
            ORDER BY r.ratedAt DESC
            """)
    List<ComplaintRatingDashboardItemResponse> findDashboardDetails();

    @Query("""
            SELECT new com.propertymanagement.modules.complaint.dto.ComplaintRatingDashboardItemResponse(
                r.id,
                r.complaintId,
                r.rating,
                r.raterRole,
                r.ratedAt,
                c.title,
                c.complaintType,
                c.status,
                c.priority,
                c.propertyId,
                p.propertyName,
                p.propertyNameAr,
                p.propertyNameEn,
                c.unitId,
                u.unitNumber,
                t.fullName,
                t.fullNameAr,
                t.fullNameEn,
                t.id,
                t.nationalId
            )
            FROM ComplaintRating r
            JOIN TenantComplaint c ON c.id = r.complaintId
            LEFT JOIN Property p ON p.id = c.propertyId
            LEFT JOIN Unit u ON u.id = c.unitId
            LEFT JOIN Tenant t ON t.id = c.tenantId
            WHERE c.propertyId IN :propertyIds
            ORDER BY r.ratedAt DESC
            """)
    List<ComplaintRatingDashboardItemResponse> findDashboardDetailsByPropertyIds(@Param("propertyIds") Set<Long> propertyIds);

    @Query("""
            SELECT AVG(CASE r.rating
                WHEN 'VERY_SATISFIED' THEN 4
                WHEN 'SATISFIED' THEN 3
                WHEN 'DISSATISFIED' THEN 2
                WHEN 'VERY_DISSATISFIED' THEN 1
                WHEN 'EXCELLENT' THEN 4
                WHEN 'VERY_GOOD' THEN 4
                WHEN 'GOOD' THEN 3
                WHEN 'FAIR' THEN 2
                WHEN 'POOR' THEN 1
                ELSE 0
            END)
            FROM ComplaintRating r
            """)
    Double getAverageRatingScore();

    @Query("""
            SELECT COUNT(r) FROM ComplaintRating r
            WHERE r.rating IN ('VERY_SATISFIED', 'EXCELLENT', 'VERY_GOOD')
            """)
    long countVerySatisfied();

    @Query("""
            SELECT COUNT(r) FROM ComplaintRating r
            WHERE r.rating IN ('SATISFIED', 'GOOD')
            """)
    long countSatisfied();

    @Query("""
            SELECT COUNT(r) FROM ComplaintRating r
            WHERE r.rating IN ('DISSATISFIED', 'FAIR')
            """)
    long countDissatisfied();

    @Query("""
            SELECT COUNT(r) FROM ComplaintRating r
            WHERE r.rating IN ('VERY_DISSATISFIED', 'POOR')
            """)
    long countVeryDissatisfied();
}
