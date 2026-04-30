package com.propertymanagement.modules.hr.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.sql.Time;
import java.time.LocalDate;

public interface AttendanceQueryRepository extends Repository<AttendanceEntity, Long> {

    @Query(value = """
            SELECT a.id AS id,
                   e.full_name AS employeeName,
                   a.attendance_date AS attendanceDate,
                   a.check_in AS checkIn,
                   a.check_out AS checkOut,
                   a.late_minutes AS lateMinutes,
                   a.status AS status
            FROM attendance a
            LEFT JOIN employees e ON e.id = a.employee_id
            ORDER BY a.attendance_date DESC, a.id DESC
            """,
            countQuery = "SELECT COUNT(*) FROM attendance",
            nativeQuery = true)
    Page<AttendanceRow> findAllRows(Pageable pageable);

    interface AttendanceRow {
        Long getId();
        String getEmployeeName();
        LocalDate getAttendanceDate();
        Time getCheckIn();
        Time getCheckOut();
        Integer getLateMinutes();
        String getStatus();
    }
}
