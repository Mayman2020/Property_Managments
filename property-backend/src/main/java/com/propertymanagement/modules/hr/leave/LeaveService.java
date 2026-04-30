package com.propertymanagement.modules.hr.leave;

import com.propertymanagement.modules.hr.leave.dto.LeaveRequestResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveQueryRepository repository;

    public Page<LeaveRequestResponse> getAll(Pageable pageable) {
        return repository.findAllRows(pageable).map(row -> LeaveRequestResponse.builder()
                .id(row.getId())
                .employeeName(row.getEmployeeName())
                .leaveTypeName(row.getLeaveTypeName())
                .startDate(row.getStartDate())
                .endDate(row.getEndDate())
                .daysCount(row.getDaysCount())
                .status(row.getStatus())
                .build());
    }
}
