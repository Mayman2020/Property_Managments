package com.propertymanagement.modules.hr.employee;

import com.propertymanagement.modules.hr.employee.dto.EmployeeRequest;
import com.propertymanagement.modules.owner.OwnerPropertyAccessService;
import com.propertymanagement.modules.hr.employee.dto.EmployeeResponse;
import com.propertymanagement.modules.contractor.ContractorCompany;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.modules.user.MaintenanceOfficerType;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
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
    private static final String DEFAULT_EMPLOYEE_PASSWORD = "1234";
    private static final String DEFAULT_CONTRACTOR_PASSWORD = "123";
    private static final UserRole DEFAULT_EMPLOYEE_ROLE = UserRole.PROCEDURES_CLERK;

    private static final Set<UserRole> EMPLOYEE_PORTAL_ROLES = Set.of(
            UserRole.ACCOUNTANT,
            UserRole.PROCEDURES_CLERK,
            UserRole.GENERAL_MANAGER,
            UserRole.MAINTENANCE_OFFICER,
            UserRole.MAINTENANCE_CONTRACTOR,
            UserRole.PROPERTY_GUARD
    );

    private final EmployeeRepository repository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public Page<EmployeeResponse> getAll(Pageable pageable, String q, Long propertyId) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            if (propertyId != null) {
                ownerPropertyAccessService.assertOwnerCanAccessProperty(propertyId);
                return repository.search(trimToNull(q), propertyId, pageable).map(this::toResponse);
            }
            return repository.searchInPropertyIds(trimToNull(q), ownerScope, pageable).map(this::toResponse);
        }
        return repository.search(trimToNull(q), propertyId, pageable).map(this::toResponse);
    }

    public EmployeeResponse getById(Long id) {
        Employee employee = find(id);
        if (employee.getPropertyId() != null) {
            ownerPropertyAccessService.assertOwnerCanAccessProperty(employee.getPropertyId());
        } else if (ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner() != null) {
            throw AppException.forbidden("You do not have access to this employee record");
        }
        return toResponse(employee);
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot create employees");
        User user = currentUser();
        Long propertyId = request.getPropertyId() != null ? request.getPropertyId() : user.getPropertyId();
        String email = trimToNull(request.getEmail());
        Employee employee = Employee.builder()
                .employeeCode(generateCode())
                .fullName(request.getFullName().trim())
                .fullNameAr(trimToNull(request.getFullNameAr()))
                .fullNameEn(trimToNull(request.getFullNameEn()))
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

        if (email != null) {
            UserRole requestedRole = request.getSystemRole() != null ? request.getSystemRole() : DEFAULT_EMPLOYEE_ROLE;
            User portalUser = ensureEmployeeSystemUser(
                    email, resolvedDisplayName(saved), saved.getPhone(), requestedRole, propertyId, request);
            saved.setLinkedUserId(portalUser.getId());
            saved = repository.save(saved);
        }

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot delete employees");
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
    private User ensureEmployeeSystemUser(
            String email,
            String fullName,
            String phone,
            UserRole role,
            Long propertyId,
            EmployeeRequest request
    ) {
        if (!EMPLOYEE_PORTAL_ROLES.contains(role)) {
            throw AppException.badRequest("Invalid system role for employee portal account");
        }
        MaintenanceOfficerType officerType = resolveOfficerType(role, request);
        Long contractorCompanyId = resolveContractorCompanyId(role, officerType, request);
        String contractorName = resolveContractorName(contractorCompanyId);
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getRole() != role) {
                throw AppException.conflict("Email already registered with a different system role: " + email, "EMAIL_USED_BY_DIFFERENT_ROLE");
            }
            return u;
        }
        return userRepository.save(User.builder()
                .username(email)
                .email(email)
                .password(passwordEncoder.encode(defaultPasswordFor(role, officerType)))
                .fullName(fullName)
                .phone(phone)
                .role(role)
                .propertyId(propertyId)
                .maintenanceOfficerType(officerType)
                .contractorCompanyId(contractorCompanyId)
                .maintenanceCompanyName(contractorName)
                .active(true)
                .build());
    }

    private MaintenanceOfficerType resolveOfficerType(UserRole role, EmployeeRequest request) {
        if (role == UserRole.MAINTENANCE_CONTRACTOR) {
            return MaintenanceOfficerType.CONTRACTOR_COMPANY;
        }
        if (role != UserRole.MAINTENANCE_OFFICER) {
            return null;
        }
        if (request.getMaintenanceOfficerType() != null) {
            return request.getMaintenanceOfficerType();
        }
        return Boolean.TRUE.equals(request.getContractorAffiliated())
                ? MaintenanceOfficerType.CONTRACTOR_COMPANY
                : MaintenanceOfficerType.INTERNAL_PROPERTY;
    }

    private Long resolveContractorCompanyId(UserRole role, MaintenanceOfficerType type, EmployeeRequest request) {
        boolean requiresContractor = role == UserRole.MAINTENANCE_CONTRACTOR
                || (role == UserRole.MAINTENANCE_OFFICER && type == MaintenanceOfficerType.CONTRACTOR_COMPANY);
        if (!requiresContractor) {
            return null;
        }
        if (request.getContractorCompanyId() == null) {
            throw AppException.badRequest("contractorCompanyId is required for contracted maintenance staff");
        }
        if (!contractorCompanyRepository.existsById(request.getContractorCompanyId())) {
            throw AppException.badRequest("Contractor company not found: " + request.getContractorCompanyId());
        }
        return request.getContractorCompanyId();
    }

    private String resolveContractorName(Long contractorCompanyId) {
        if (contractorCompanyId == null) {
            return null;
        }
        ContractorCompany cc = contractorCompanyRepository.findById(contractorCompanyId).orElse(null);
        if (cc == null) {
            return null;
        }
        return firstNonBlank(cc.getNameAr(), cc.getNameEn(), cc.getName());
    }

    private String defaultPasswordFor(UserRole role, MaintenanceOfficerType type) {
        boolean contractedMaintenance = role == UserRole.MAINTENANCE_CONTRACTOR
                || (role == UserRole.MAINTENANCE_OFFICER && type == MaintenanceOfficerType.CONTRACTOR_COMPANY);
        return contractedMaintenance ? DEFAULT_CONTRACTOR_PASSWORD : DEFAULT_EMPLOYEE_PASSWORD;
    }

    private Employee find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Employee not found: " + id));
    }

    private EmployeeResponse toResponse(Employee employee) {
        String title = LocalizedNameResolver.resolve(employee.getJobTitleAr(), employee.getJobTitleEn(), null);
        String resolvedName = resolvedDisplayName(employee);
        return EmployeeResponse.builder()
                .id(employee.getId())
                .propertyId(employee.getPropertyId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(resolvedName)
                .fullNameAr(firstNonBlank(employee.getFullNameAr(), employee.getFullName()))
                .fullNameEn(firstNonBlank(employee.getFullNameEn(), employee.getFullName()))
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

    private String resolvedDisplayName(Employee employee) {
        return LocalizedNameResolver.resolve(
                employee.getFullNameAr(),
                employee.getFullNameEn(),
                employee.getFullName());
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
