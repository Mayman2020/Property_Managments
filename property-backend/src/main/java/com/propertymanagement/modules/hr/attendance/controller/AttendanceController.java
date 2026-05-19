package com.propertymanagement.modules.hr.attendance.controller;

import com.propertymanagement.modules.hr.attendance.dto.AttendanceResponse;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.propertymanagement.modules.hr.attendance.service.AttendanceService;

@RestController
@RequestMapping("/hr/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService service;

    @GetMapping
    @RequiresPermission(module = "hr", action = "view")
    public ResponseEntity<ApiResponse<Page<AttendanceResponse>>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable)));
    }
}
