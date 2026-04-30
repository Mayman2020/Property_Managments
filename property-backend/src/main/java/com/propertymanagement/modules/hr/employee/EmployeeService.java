package com.propertymanagement.modules.hr.employee;

import com.propertymanagement.modules.hr.employee.dto.EmployeeRequest;
import com.propertymanagement.modules.hr.employee.dto.EmployeeResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository repository;

    public Page<EmployeeResponse> getAll(Pageable pageable, String q, Long propertyId) {
        return repository.search(trimToNull(q), propertyId, pageable).map(this::toResponse);
    }

    public EmployeeResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        User user = currentUser();
        Long propertyId = request.getPropertyId() != null ? request.getPropertyId() : user.getPropertyId();
        Employee employee = Employee.builder()
                .employeeCode(generateCode())
                .fullName(request.getFullName().trim())
                .phone(trimToNull(request.getPhone()))
                .email(trimToNull(request.getEmail()))
                .jobTitleAr(trimToNull(request.getJobTitleAr()))
                .jobTitleEn(trimToNull(request.getJobTitleEn()))
                .hireDate(request.getHireDate())
                .basicSalary(request.getBasicSalary())
                .propertyId(propertyId)
                .build();
        return toResponse(repository.save(employee));
    }

    private Employee find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Employee not found: " + id));
    }

    private EmployeeResponse toResponse(Employee employee) {
        String title = firstNonBlank(employee.getJobTitleAr(), employee.getJobTitleEn());
        return EmployeeResponse.builder()
                .id(employee.getId())
                .propertyId(employee.getPropertyId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(employee.getFullName())
                .phone(employee.getPhone())
                .email(employee.getEmail())
                .jobTitle(title)
                .basicSalary(employee.getBasicSalary())
                .totalSalary(employee.getTotalSalary())
                .status(employee.getStatus())
                .hireDate(employee.getHireDate())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private String generateCode() {
        return "EMP-" + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
