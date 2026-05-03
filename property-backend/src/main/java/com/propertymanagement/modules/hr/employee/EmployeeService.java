package com.propertymanagement.modules.hr.employee;

import com.propertymanagement.modules.hr.employee.dto.EmployeeRequest;
import com.propertymanagement.modules.hr.employee.dto.EmployeeResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private static final Set<UserRole> EMPLOYEE_PORTAL_ROLES = Set.of(
            UserRole.ACCOUNTANT,
            UserRole.HR_OFFICER,
            UserRole.CONTRACTS_OFFICER,
            UserRole.MAINTENANCE_OFFICER,
            UserRole.PROPERTY_ADMIN
    );

    private final EmployeeRepository repository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

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
        String email = trimToNull(request.getEmail());
        Employee employee = Employee.builder()
                .employeeCode(generateCode())
                .fullName(request.getFullName().trim())
                .phone(trimToNull(request.getPhone()))
                .email(email)
                .nationalId(trimToNull(request.getNationalId()))
                .profileImageUrl(trimToNull(request.getProfileImageUrl()))
                .civilIdImageUrl(trimToNull(request.getCivilIdImageUrl()))
                .jobTitleAr(trimToNull(request.getJobTitleAr()))
                .jobTitleEn(trimToNull(request.getJobTitleEn()))
                .hireDate(request.getHireDate())
                .basicSalary(request.getBasicSalary())
                .propertyId(propertyId)
                .build();

        Employee saved = repository.save(employee);

        if (email != null && request.getSystemRole() != null) {
            User portalUser = ensureEmployeeSystemUser(
                    email, saved.getFullName(), saved.getPhone(), request.getSystemRole(), propertyId);
            saved.setLinkedUserId(portalUser.getId());
            saved = repository.save(saved);
        }

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = find(id);
        if (employee.getPropertyId() != null) {
            throw AppException.badRequest("Cannot delete employee assigned to a property. Clear the property assignment first.");
        }
        Long portalUserId = employee.getLinkedUserId();
        if (portalUserId == null && employee.getEmail() != null && !employee.getEmail().isBlank()) {
            portalUserId = userRepository.findByEmailIgnoreCase(employee.getEmail().trim())
                    .filter(u -> EMPLOYEE_PORTAL_ROLES.contains(u.getRole()))
                    .map(User::getId)
                    .orElse(null);
        }
        repository.delete(employee);
        if (portalUserId != null) {
            userService.delete(portalUserId);
        }
    }

    /**
     * Creates or reuses a system user for the employee portal role; refuses mismatched roles on the same email.
     */
    private User ensureEmployeeSystemUser(String email, String fullName, String phone, UserRole role, Long propertyId) {
        if (!EMPLOYEE_PORTAL_ROLES.contains(role)) {
            throw AppException.badRequest("Invalid system role for employee portal account");
        }
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getRole() != role) {
                throw AppException.conflict("Email already registered with a different system role: " + email);
            }
            return u;
        }
        return userRepository.save(User.builder()
                .username(email)
                .email(email)
                .password(passwordEncoder.encode("12345"))
                .fullName(fullName)
                .phone(phone)
                .role(role)
                .propertyId(propertyId)
                .active(true)
                .build());
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
                .nationalId(employee.getNationalId())
                .profileImageUrl(employee.getProfileImageUrl())
                .civilIdImageUrl(employee.getCivilIdImageUrl())
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
