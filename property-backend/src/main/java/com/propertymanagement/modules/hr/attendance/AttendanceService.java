package com.propertymanagement.modules.hr.attendance;

import com.propertymanagement.modules.hr.attendance.dto.AttendanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceQueryRepository repository;

    public Page<AttendanceResponse> getAll(Pageable pageable) {
        return repository.findAllRows(pageable).map(row -> AttendanceResponse.builder()
                .id(row.getId())
                .employeeName(row.getEmployeeName())
                .attendanceDate(row.getAttendanceDate())
                .checkIn(row.getCheckIn() != null ? row.getCheckIn().toString() : null)
                .checkOut(row.getCheckOut() != null ? row.getCheckOut().toString() : null)
                .lateMinutes(row.getLateMinutes())
                .status(row.getStatus())
                .build());
    }
}
