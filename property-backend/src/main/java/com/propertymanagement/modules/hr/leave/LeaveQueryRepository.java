package com.propertymanagement.modules.hr.leave;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.time.LocalDate;

public interface LeaveQueryRepository extends Repository<LeaveRequestEntity, Long> {

    @Query(value = """
            SELECT lr.id AS id,
                   e.full_name AS employeeName,
                   COALESCE(lt.type_name_ar, lt.type_name_en) AS leaveTypeName,
                   lr.start_date AS startDate,
                   lr.end_date AS endDate,
                   lr.days_count AS daysCount,
                   lr.status AS status
            FROM leave_requests lr
            LEFT JOIN employees e ON e.id = lr.employee_id
            LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
            ORDER BY lr.created_at DESC
            """,
            countQuery = "SELECT COUNT(*) FROM leave_requests",
            nativeQuery = true)
    Page<LeaveRow> findAllRows(Pageable pageable);

    interface LeaveRow {
        Long getId();
        String getEmployeeName();
        String getLeaveTypeName();
        LocalDate getStartDate();
        LocalDate getEndDate();
        Integer getDaysCount();
        String getStatus();
    }
}
