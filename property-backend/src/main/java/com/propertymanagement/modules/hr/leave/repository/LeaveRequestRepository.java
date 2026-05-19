package com.propertymanagement.modules.hr.leave.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.propertymanagement.modules.hr.leave.entity.LeaveRequestEntity;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequestEntity, Long> {

    List<LeaveRequestEntity> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    @Query(value = """
            SELECT COALESCE(SUM(days_count), 0)
            FROM leave_requests
            WHERE employee_id = :employeeId
              AND status = 'APPROVED'
              AND EXTRACT(YEAR FROM start_date) = :year
            """, nativeQuery = true)
    int sumApprovedDaysByEmployeeAndYear(@Param("employeeId") Long employeeId, @Param("year") int year);

    @Query(value = """
            SELECT CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END
            FROM leave_requests
            WHERE employee_id = :employeeId
              AND status IN ('PENDING', 'APPROVED')
              AND start_date <= :endDate
              AND end_date >= :startDate
            """, nativeQuery = true)
    boolean existsOverlappingActiveRequest(
            @Param("employeeId") Long employeeId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);
}
