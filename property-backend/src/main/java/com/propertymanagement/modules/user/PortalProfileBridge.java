package com.propertymanagement.modules.user;

import com.propertymanagement.modules.auth.dto.LoginResponse;
import com.propertymanagement.modules.hr.employee.Employee;
import com.propertymanagement.modules.hr.employee.EmployeeRepository;
import com.propertymanagement.modules.owner.Owner;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.user.dto.EmployeeProfileLinkDto;
import com.propertymanagement.modules.user.dto.OwnerProfileLinkDto;
import com.propertymanagement.modules.user.dto.TenantProfileLinkDto;
import com.propertymanagement.modules.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Fills portal-facing profile fields from the domain row (owner / tenant / employee)
 * when the {@link User} row is missing photos or documents.
 */
@Component
@RequiredArgsConstructor
public class PortalProfileBridge {

    private static final Set<UserRole> EMPLOYEE_ROLES = Set.of(
            UserRole.ACCOUNTANT, UserRole.HR_OFFICER, UserRole.CONTRACTS_OFFICER,
            UserRole.MAINTENANCE_OFFICER, UserRole.PROPERTY_ADMIN);

    private final OwnerRepository ownerRepository;
    private final TenantRepository tenantRepository;
    private final EmployeeRepository employeeRepository;

    public UserResponse mergeRoleRecordIntoResponse(UserResponse base, User user) {
        return switch (user.getRole()) {
            case OWNER -> ownerRepository.findByUserId(user.getId())
                    .map(o -> mergeOwner(base, user, o))
                    .orElse(base);
            case TENANT -> tenantRepository.findByUserId(user.getId())
                    .map(t -> mergeTenant(base, user, t))
                    .orElse(base);
            default -> {
                if (EMPLOYEE_ROLES.contains(user.getRole())
                        && user.getEmail() != null
                        && !user.getEmail().isBlank()) {
                    yield employeeRepository.findByEmailIgnoreCase(user.getEmail().trim())
                            .map(e -> mergeEmployee(base, user, e))
                            .orElse(base);
                }
                yield base;
            }
        };
    }

    public LoginResponse.UserDto mergeRoleRecordIntoLoginUser(LoginResponse.UserDto base, User user) {
        return switch (user.getRole()) {
            case OWNER -> ownerRepository.findByUserId(user.getId())
                    .map(o -> mergeOwnerLogin(base, user, o))
                    .orElse(base);
            case TENANT -> tenantRepository.findByUserId(user.getId())
                    .map(t -> mergeTenantLogin(base, user, t))
                    .orElse(base);
            default -> {
                if (EMPLOYEE_ROLES.contains(user.getRole())
                        && user.getEmail() != null
                        && !user.getEmail().isBlank()) {
                    yield employeeRepository.findByEmailIgnoreCase(user.getEmail().trim())
                            .map(e -> mergeEmployeeLogin(base, user, e))
                            .orElse(base);
                }
                yield base;
            }
        };
    }

    private UserResponse mergeOwner(UserResponse b, User user, Owner o) {
        return b.toBuilder()
                .fullName(firstNonBlank(user.getFullName(), o.getFullName()))
                .phone(firstNonBlank(user.getPhone(), o.getPhone()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), o.getProfileImageUrl()))
                .civilIdImageUrl(o.getCivilIdImageUrl())
                .leaseContractFiles(null)
                .ownerLink(toOwnerLink(o))
                .tenantLink(null)
                .employeeLink(null)
                .build();
    }

    private UserResponse mergeTenant(UserResponse b, User user, Tenant t) {
        List<String> leases = t.getLeaseContractFiles() == null || t.getLeaseContractFiles().isEmpty()
                ? null
                : List.copyOf(t.getLeaseContractFiles());
        return b.toBuilder()
                .fullName(firstNonBlank(user.getFullName(), t.getFullName()))
                .phone(firstNonBlank(user.getPhone(), t.getPhone()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), t.getProfileImage()))
                .civilIdImageUrl(null)
                .leaseContractFiles(leases)
                .ownerLink(null)
                .tenantLink(toTenantLink(t))
                .employeeLink(null)
                .build();
    }

    private UserResponse mergeEmployee(UserResponse b, User user, Employee e) {
        return b.toBuilder()
                .fullName(firstNonBlank(user.getFullName(), e.getFullName()))
                .phone(firstNonBlank(user.getPhone(), e.getPhone()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), e.getProfileImageUrl()))
                .civilIdImageUrl(e.getCivilIdImageUrl())
                .leaseContractFiles(null)
                .ownerLink(null)
                .tenantLink(null)
                .employeeLink(toEmployeeLink(e))
                .build();
    }

    private LoginResponse.UserDto mergeOwnerLogin(LoginResponse.UserDto b, User user, Owner o) {
        return b.toBuilder()
                .fullName(firstNonBlank(user.getFullName(), o.getFullName()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), o.getProfileImageUrl()))
                .civilIdImageUrl(o.getCivilIdImageUrl())
                .leaseContractFiles(null)
                .build();
    }

    private LoginResponse.UserDto mergeTenantLogin(LoginResponse.UserDto b, User user, Tenant t) {
        List<String> leases = t.getLeaseContractFiles() == null || t.getLeaseContractFiles().isEmpty()
                ? null
                : List.copyOf(t.getLeaseContractFiles());
        return b.toBuilder()
                .fullName(firstNonBlank(user.getFullName(), t.getFullName()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), t.getProfileImage()))
                .civilIdImageUrl(null)
                .leaseContractFiles(leases)
                .build();
    }

    private LoginResponse.UserDto mergeEmployeeLogin(LoginResponse.UserDto b, User user, Employee e) {
        return b.toBuilder()
                .fullName(firstNonBlank(user.getFullName(), e.getFullName()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), e.getProfileImageUrl()))
                .civilIdImageUrl(e.getCivilIdImageUrl())
                .leaseContractFiles(null)
                .build();
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback.trim();
        }
        return primary;
    }

    private static OwnerProfileLinkDto toOwnerLink(Owner o) {
        return OwnerProfileLinkDto.builder()
                .fullNameAr(o.getFullNameAr())
                .fullNameEn(o.getFullNameEn())
                .nationalId(o.getNationalId())
                .address(o.getAddress())
                .notes(o.getNotes())
                .build();
    }

    private static TenantProfileLinkDto toTenantLink(Tenant t) {
        return TenantProfileLinkDto.builder()
                .nationalId(t.getNationalId())
                .leaseStart(t.getLeaseStart())
                .leaseEnd(t.getLeaseEnd())
                .notes(t.getNotes())
                .build();
    }

    private static EmployeeProfileLinkDto toEmployeeLink(Employee e) {
        return EmployeeProfileLinkDto.builder()
                .nationalId(e.getNationalId())
                .jobTitleAr(e.getJobTitleAr())
                .jobTitleEn(e.getJobTitleEn())
                .build();
    }
}
