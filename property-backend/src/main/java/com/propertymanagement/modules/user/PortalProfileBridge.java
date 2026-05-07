package com.propertymanagement.modules.user;

import com.propertymanagement.modules.auth.dto.LoginResponse;
import com.propertymanagement.modules.hr.employee.Employee;
import com.propertymanagement.modules.hr.employee.EmployeeRepository;
import com.propertymanagement.modules.owner.Owner;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.user.dto.EmployeeProfileLinkDto;
import com.propertymanagement.modules.user.dto.OwnerPropertyBriefDto;
import com.propertymanagement.modules.user.dto.OwnerProfileLinkDto;
import com.propertymanagement.modules.user.dto.TenantProfileLinkDto;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
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
            UserRole.ACCOUNTANT,
            UserRole.PROCEDURES_CLERK,
            UserRole.GENERAL_MANAGER,
            UserRole.MAINTENANCE_OFFICER_INTERNAL,
            UserRole.MAINTENANCE_OFFICER_COMPANY,
            UserRole.MAINTENANCE_COMPANY,
            UserRole.PROPERTY_GUARD);

    private final OwnerRepository ownerRepository;
    private final TenantRepository tenantRepository;
    private final EmployeeRepository employeeRepository;
    private final PropertyRepository propertyRepository;

    public UserResponse mergeRoleRecordIntoResponse(UserResponse base, User user) {
        return switch (user.getRole()) {
            case OWNER -> ownerRepository.findByUserId(user.getId())
                    .map(o -> mergeOwner(base, user, o))
                    .orElseGet(() -> mergeOwnerPropertiesWithoutRegistryRow(base, user));
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

    /**
     * Owner login exists but no {@code owners.user_id} link — still list properties whose
     * denormalized {@code owner_email} matches this user (common when property was saved before linking).
     */
    private UserResponse mergeOwnerPropertiesWithoutRegistryRow(UserResponse b, User user) {
        List<OwnerPropertyBriefDto> props = resolveOwnerPropertyBriefs(null, user.getEmail());
        if (props.isEmpty()) {
            return b;
        }
        return b.toBuilder().ownerProperties(props).build();
    }

    private UserResponse mergeOwner(UserResponse b, User user, Owner o) {
        List<OwnerPropertyBriefDto> ownerProps = resolveOwnerPropertyBriefs(o.getId(), user.getEmail());
        return b.toBuilder()
                .fullName(LocalizedNameResolver.resolve(o.getFullNameAr(), o.getFullNameEn(), firstNonBlank(user.getFullName(), o.getFullName())))
                .fullNameAr(firstNonBlank(o.getFullNameAr(), user.getFullName()))
                .fullNameEn(firstNonBlank(o.getFullNameEn(), user.getFullName()))
                .phone(firstNonBlank(user.getPhone(), o.getPhone()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), o.getProfileImageUrl()))
                .civilIdImageUrl(o.getCivilIdImageUrl())
                .leaseContractFiles(null)
                .ownerLink(toOwnerLink(o))
                .tenantLink(null)
                .employeeLink(null)
                .ownerProperties(ownerProps.isEmpty() ? null : ownerProps)
                .build();
    }

    /**
     * Resolves active properties for an owner user: {@code properties.owner_id} / co-owner table,
     * plus any row whose {@code owner_email} matches the portal user's email.
     */
    private List<OwnerPropertyBriefDto> resolveOwnerPropertyBriefs(Long ownerRecordId, String userEmail) {
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        if (ownerRecordId != null) {
            propertyRepository.findByOwnerIdAndActiveTrue(ownerRecordId).forEach(p -> ids.add(p.getId()));
            for (Long pid : propertyRepository.findPropertyIdsByCoOwner(ownerRecordId)) {
                if (pid != null) {
                    ids.add(pid);
                }
            }
        }
        String em = userEmail == null ? "" : userEmail.trim();
        if (!em.isBlank()) {
            for (Property p : propertyRepository.findAllActiveByOwnerEmailNormalized(em)) {
                ids.add(p.getId());
            }
        }
        if (ids.isEmpty()) {
            return List.of();
        }
        List<OwnerPropertyBriefDto> out = new ArrayList<>();
        for (Long propertyId : ids) {
            propertyRepository.findById(propertyId)
                    .filter(Property::isActive)
                    .ifPresent(p -> out.add(OwnerPropertyBriefDto.builder()
                            .id(p.getId())
                            .propertyName(p.getPropertyName())
                            .propertyNameAr(p.getPropertyNameAr())
                            .propertyNameEn(p.getPropertyNameEn())
                            .propertyCode(p.getPropertyCode())
                            .build()));
        }
        return out;
    }

    private UserResponse mergeTenant(UserResponse b, User user, Tenant t) {
        List<String> leases = t.getLeaseContractFiles() == null || t.getLeaseContractFiles().isEmpty()
                ? null
                : List.copyOf(t.getLeaseContractFiles());
        return b.toBuilder()
                .fullName(LocalizedNameResolver.resolve(t.getFullNameAr(), t.getFullNameEn(), firstNonBlank(user.getFullName(), t.getFullName())))
                .fullNameAr(firstNonBlank(t.getFullNameAr(), user.getFullName()))
                .fullNameEn(firstNonBlank(t.getFullNameEn(), user.getFullName()))
                .phone(firstNonBlank(user.getPhone(), t.getPhone()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), t.getProfileImage()))
                .civilIdImageUrl(t.getCivilIdImageUrl())
                .leaseContractFiles(leases)
                .ownerLink(null)
                .tenantLink(toTenantLink(t))
                .employeeLink(null)
                .build();
    }

    private UserResponse mergeEmployee(UserResponse b, User user, Employee e) {
        return b.toBuilder()
                .fullName(LocalizedNameResolver.resolve(e.getFullNameAr(), e.getFullNameEn(), firstNonBlank(user.getFullName(), e.getFullName())))
                .fullNameAr(firstNonBlank(e.getFullNameAr(), user.getFullName()))
                .fullNameEn(firstNonBlank(e.getFullNameEn(), user.getFullName()))
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
                .fullName(LocalizedNameResolver.resolve(o.getFullNameAr(), o.getFullNameEn(), firstNonBlank(user.getFullName(), o.getFullName())))
                .fullNameAr(firstNonBlank(o.getFullNameAr(), user.getFullName()))
                .fullNameEn(firstNonBlank(o.getFullNameEn(), user.getFullName()))
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
                .fullName(LocalizedNameResolver.resolve(t.getFullNameAr(), t.getFullNameEn(), firstNonBlank(user.getFullName(), t.getFullName())))
                .fullNameAr(firstNonBlank(t.getFullNameAr(), user.getFullName()))
                .fullNameEn(firstNonBlank(t.getFullNameEn(), user.getFullName()))
                .profileImageUrl(firstNonBlank(user.getProfileImageUrl(), t.getProfileImage()))
                .civilIdImageUrl(t.getCivilIdImageUrl())
                .leaseContractFiles(leases)
                .build();
    }

    private LoginResponse.UserDto mergeEmployeeLogin(LoginResponse.UserDto b, User user, Employee e) {
        return b.toBuilder()
                .fullName(LocalizedNameResolver.resolve(e.getFullNameAr(), e.getFullNameEn(), firstNonBlank(user.getFullName(), e.getFullName())))
                .fullNameAr(firstNonBlank(e.getFullNameAr(), user.getFullName()))
                .fullNameEn(firstNonBlank(e.getFullNameEn(), user.getFullName()))
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
                .fullNameAr(t.getFullNameAr())
                .fullNameEn(t.getFullNameEn())
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
