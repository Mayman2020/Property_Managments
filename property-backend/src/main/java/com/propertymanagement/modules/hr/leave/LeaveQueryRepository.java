package com.propertymanagement.modules.hr.leave;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.time.LocalDate;

public interface LeaveQueryRepository extends Repository<LeaveRequestEntity, Long> {

    @Query(value = """
            SELECT lr.id AS id,
                   lr.employee_id AS employeeId,
                   lr.leave_type_id AS leaveTypeId,
                   e.full_name AS employeeName,
                   COALESCE(lt.type_name_ar, lt.type_name_en) AS leaveTypeName,
                   lr.start_date AS startDate,
                   lr.end_date AS endDate,
                   lr.days_count AS daysCount,
                   lr.status AS status,
                   lr.reason AS reason,
                   lr.rejection_reason AS rejectionReason
            FROM leave_requests lr
            LEFT JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            ORDER BY lr.created_at DESC
            """,
            countQuery = "SELECT COUNT(*) FROM leave_requests",
            nativeQuery = true)
    Page<LeaveRow> findAllRows(Pageable pageable);

    @Query(value = """
            SELECT lr.id AS id,
                   lr.employee_id AS employeeId,
                   lr.leave_type_id AS leaveTypeId,
                   e.full_name AS employeeName,
                   COALESCE(lt.type_name_ar, lt.type_name_en) AS leaveTypeName,
                   lr.start_date AS startDate,
                   lr.end_date AS endDate,
                   lr.days_count AS daysCount,
                   lr.status AS status,
                   lr.reason AS reason,
                   lr.rejection_reason AS rejectionReason
            FROM leave_requests lr
            LEFT JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE e.property_id = :propertyId
            ORDER BY lr.created_at DESC
            """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM leave_requests lr
                    LEFT JOIN employees e ON e.id = lr.employee_id
                    WHERE e.property_id = :propertyId
                    """,
            nativeQuery = true)
    Page<LeaveRow> findAllRowsByPropertyId(@Param("propertyId") Long propertyId, Pageable pageable);

    @Query(value = """
            SELECT lr.id AS id,
                   lr.employee_id AS employeeId,
                   lr.leave_type_id AS leaveTypeId,
                   e.full_name AS employeeName,
                   COALESCE(lt.type_name_ar, lt.type_name_en) AS leaveTypeName,
                   lr.start_date AS startDate,
                   lr.end_date AS endDate,
                   lr.days_count AS daysCount,
                   lr.status AS status,
                   lr.reason AS reason,
                   lr.rejection_reason AS rejectionReason
            FROM leave_requests lr
            LEFT JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE e.property_id IN (:propertyIds)
            ORDER BY lr.created_at DESC
            """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM leave_requests lr
                    LEFT JOIN employees e ON e.id = lr.employee_id
                    WHERE e.property_id IN (:propertyIds)
                    """,
            nativeQuery = true)
    Page<LeaveRow> findAllRowsByPropertyIds(@Param("propertyIds") Collection<Long> propertyIds, Pageable pageable);

    @Query(value = """
            SELECT lr.id AS id,
                   lr.employee_id AS employeeId,
                   lr.leave_type_id AS leaveTypeId,
                   e.full_name AS employeeName,
                   COALESCE(lt.type_name_ar, lt.type_name_en) AS leaveTypeName,
                   lr.start_date AS startDate,
                   lr.end_date AS endDate,
                   lr.days_count AS daysCount,
                   lr.status AS status,
                   lr.reason AS reason,
                   lr.rejection_reason AS rejectionReason
            FROM leave_requests lr
            LEFT JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.id = :id
            """, nativeQuery = true)
    java.util.Optional<LeaveRow> findRowById(@Param("id") Long id);

    interface LeaveRow {
        Long getId();
        Long getEmployeeId();
        Long getLeaveTypeId();
        String getEmployeeName();
        String getLeaveTypeName();
        LocalDate getStartDate();
        LocalDate getEndDate();
        Integer getDaysCount();
        String getStatus();
        String getReason();
        String getRejectionReason();
    }
}
