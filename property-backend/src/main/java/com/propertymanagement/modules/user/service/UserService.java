package com.propertymanagement.modules.user.service;

import com.propertymanagement.modules.user.dto.EmployeeProfileLinkDto;
import com.propertymanagement.modules.user.dto.OwnerProfileLinkDto;
import com.propertymanagement.modules.user.dto.TenantProfileLinkDto;
import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.dto.UserProfileUpdateRequest;
import com.propertymanagement.modules.user.dto.ChangePasswordRequest;
import com.propertymanagement.modules.user.dto.UserRoleUpdateRequest;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceProviderRepository;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.complaint.repository.TenantComplaintRepository;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentRepository;
import com.propertymanagement.modules.tenantportal.repository.ContractActionRequestRepository;
import com.propertymanagement.modules.tenantportal.repository.RentReceiptRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import com.propertymanagement.shared.i18n.BilingualNotificationText;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import com.propertymanagement.shared.security.PropertyScopeService;
import com.propertymanagement.codegen.CodeGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.entity.UserExtraRoles;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class UserService {

    @org.springframework.beans.factory.annotation.Value("${user.default.password:ChangeMeNow@1234}")
    private String defaultUserPassword;

    private final UserRepository userRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final OwnerRepository ownerRepository;
    private final TenantRepository tenantRepository;
    private final EmployeeRepository employeeRepository;
    private final MaintenanceProviderRepository maintenanceProviderRepository;
    private final LeaseContractRepository leaseContractRepository;
    private final LeaseContractService leaseContractService;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final RentReceiptRepository rentReceiptRepository;
    private final ContractActionRequestRepository contractActionRequestRepository;
    private final RentPaymentRepository rentPaymentRepository;
    private final TenantComplaintRepository tenantComplaintRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final PortalProfileBridge portalProfileBridge;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AppMessages appMessages;
    private final PropertyScopeService propertyScopeService;
    private final CodeGenerationService codeGenerationService;

    private static final Set<UserRole> EMPLOYEE_ROLES = Set.of(
            UserRole.ACCOUNTANT,
            UserRole.PROCEDURES_CLERK,
            UserRole.GENERAL_MANAGER,
            UserRole.MAINTENANCE_OFFICER_INTERNAL,
            UserRole.MAINTENANCE_OFFICER_COMPANY,
            UserRole.MAINTENANCE_COMPANY,
            UserRole.PROPERTY_GUARD);

    public Page<UserResponse> getAll(Pageable pageable, String q, UserRole role) {
        var propertyIds = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (propertyIds != null && propertyIds.isEmpty()) {
            return Page.empty(pageable);
        }
        return userRepository.search(trimToNull(q), role, propertyIds == null ? null : new java.util.ArrayList<>(propertyIds), pageable)
                .map(u -> localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(toResponse(u), u)));
    }

    public UserResponse getById(Long id) {
        User u = find(id);
        var propertyIds = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (propertyIds != null && !propertyIds.contains(u.getPropertyId())) {
            throw AppException.forbidden("Access denied");
        }
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(toResponse(u), u));
    }

    public UserResponse getMyProfile() {
        User user = find(currentUserId());
        UserResponse base = toResponse(user);
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(base, user));
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("Email already in use: " + request.getEmail(), "EMAIL_ALREADY_USED");
        }
        validateMaintenanceOfficerDetails(request);
        boolean usingDefaultPassword = request.getPassword() == null || request.getPassword().isBlank();
        String rawPassword = usingDefaultPassword ? defaultPasswordFor(request) : request.getPassword();
        User user = User.builder()
                .username(request.getEmail())
                .email(request.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .fullName(request.getFullName())
                .fullNameAr(firstNonBlank(request.getFullNameAr(), request.getFullName()))
                .fullNameEn(firstNonBlank(request.getFullNameEn(), request.getFullName()))
                .phone(request.getPhone())
                .profileImageUrl(request.getProfileImageUrl())
                .civilIdImageUrl(request.getCivilIdImageUrl())
                .bio(request.getBio())
                .role(request.getRole())
                .propertyId(request.getPropertyId())
                .maintenanceOfficerType(request.getMaintenanceOfficerType())
                .maintenanceCompanyName(request.getMaintenanceCompanyName())
                .contractorCompanyId(request.getContractorCompanyId())
                .active(true)
                .mustChangePassword(usingDefaultPassword)
                .build();
        syncContractorDisplayName(user);
        normalizeRoleSpecificFields(user);
        User saved = userRepository.save(user);
        autoCreateOwnerRecord(saved);
        syncLinkedRoleMediaFromUserRequest(saved, request);
        applyLinkPatchesFromUserRequest(saved, request);
        notifyEmployeePropertyAssignment(saved);
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(toResponse(saved), saved));
    }

    /** First login context: staff assigned to a specific property. */
    public void notifyEmployeePropertyAssignment(User u) {
        if (u.getPropertyId() == null || !EMPLOYEE_ROLES.contains(u.getRole())) {
            return;
        }
        propertyRepository.findById(u.getPropertyId()).ifPresent(p -> {
            String prop = BilingualNotificationText.composite(
                    p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName());
            AppMessages.Bilingual titleB = appMessages.bilingual("employee.notify.property_assignment.title");
            String title = BilingualNotificationText.title(titleB.ar(), titleB.en());
            String body = BilingualNotificationText.body(
                    appMessages.get(AppMessages.LOCALE_AR, "employee.notify.property_assignment.body",
                            prop, employeeRoleLabel(u.getRole(), AppMessages.LOCALE_AR)),
                    appMessages.get(AppMessages.LOCALE_EN, "employee.notify.property_assignment.body",
                            prop, employeeRoleLabel(u.getRole(), AppMessages.LOCALE_EN)));
            notificationService.createForRecipients(
                    List.of(u.getId()),
                    null,
                    u.getPropertyId(),
                    null,
                    NotificationType.GENERAL,
                    title,
                    body
            );
        });
    }

    private String employeeRoleLabel(UserRole r, Locale locale) {
        String key = "role.label." + r.name();
        String msg = appMessages.get(locale, key);
        if (msg.equals(key)) {
            return r.name();
        }
        return msg;
    }

    /**
     * Notify when an employee row first gets a property, the property changes, or a login becomes a property-scoped employee.
     */
    private void notifyEmployeePropertyAssignmentIfContextChanged(UserRole previousRole, Long previousPropertyId, User saved) {
        if (saved.getPropertyId() == null || !EMPLOYEE_ROLES.contains(saved.getRole())) {
            return;
        }
        boolean wasEligible = previousPropertyId != null && EMPLOYEE_ROLES.contains(previousRole);
        boolean propertyChanged = !Objects.equals(previousPropertyId, saved.getPropertyId());
        if (!wasEligible || propertyChanged) {
            notifyEmployeePropertyAssignment(saved);
        }
    }

    private void autoCreateOwnerRecord(User user) {
        autoCreateRoleRecord(user);
    }

    private void autoCreateRoleRecord(User user) {
        switch (user.getRole()) {
            case OWNER -> autoCreateOwner(user);
            case TENANT -> autoCreateTenant(user);
            default -> {
                if (EMPLOYEE_ROLES.contains(user.getRole())) autoCreateEmployee(user);
            }
        }
    }

    private void autoCreateOwner(User user) {
        if (ownerRepository.findByUserId(user.getId()).isPresent()) return;
        String n = user.getFullName() != null ? user.getFullName().trim() : "";
        if (n.isEmpty()) {
            n = "Owner";
        }
        String ar = firstNonBlank(user.getFullNameAr(), n);
        String en = firstNonBlank(user.getFullNameEn(), n);
        ownerRepository.save(Owner.builder()
                .fullNameAr(ar)
                .fullNameEn(en)
                .fullName(ownerCompositeLine(ar, en))
                .email(user.getEmail())
                .phone(user.getPhone())
                .userId(user.getId())
                .portalAccess(true)
                .active(true)
                .build());
    }

    private void autoCreateTenant(User user) {
        if (tenantRepository.findByUserId(user.getId()).isPresent()) return;
        String email = user.getEmail() != null ? user.getEmail().trim() : null;
        if (email != null && !email.isBlank() && tenantRepository.existsByEmail(email)) {
            throw AppException.conflict("Email already registered: " + email, "EMAIL_ALREADY_USED");
        }
        String n = user.getFullName() != null ? user.getFullName().trim() : "Tenant";
        if (n.isEmpty()) n = "Tenant";
        String ar = firstNonBlank(user.getFullNameAr(), n);
        String en = firstNonBlank(user.getFullNameEn(), n);
        tenantRepository.save(Tenant.builder()
                .userId(user.getId())
                .fullName(ownerCompositeLine(ar, en))
                .fullNameAr(ar)
                .fullNameEn(en)
                .email(user.getEmail())
                .phone(user.getPhone() != null ? user.getPhone() : "-")
                .propertyId(user.getPropertyId())
                .active(true)
                .build());
    }

    private void autoCreateEmployee(User user) {
        if (user.getEmail() != null && employeeRepository.findByEmail(user.getEmail()).isPresent()) return;
        // Use the shared sequence-backed generator (employees_employee_code_key is unique). The
        // legacy "EMP-yyyyMMddHHmmss" stamp collided whenever two employee-role users were created
        // within the same second.
        String code = codeGenerationService.generate("EMP");
        String n = firstNonBlank(user.getFullName(), "Employee");
        String ar = firstNonBlank(user.getFullNameAr(), n);
        String en = firstNonBlank(user.getFullNameEn(), n);
        employeeRepository.save(Employee.builder()
                .employeeCode(code)
                .fullName(n)
                .fullNameAr(ar)
                .fullNameEn(en)
                .email(user.getEmail())
                .phone(user.getPhone())
                .propertyId(user.getPropertyId())
                .hireDate(LocalDate.now())
                .basicSalary(BigDecimal.ZERO)
                .linkedUserId(user.getId())
                .build());
    }

    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        User user = find(id);
        UserRole previousRole = user.getRole();
        Long previousPropertyId = user.getPropertyId();
        validateMaintenanceOfficerDetails(request);
        user.setFullName(request.getFullName());
        user.setFullNameAr(firstNonBlank(request.getFullNameAr(), request.getFullName()));
        user.setFullNameEn(firstNonBlank(request.getFullNameEn(), request.getFullName()));
        user.setPhone(request.getPhone());
        user.setProfileImageUrl(request.getProfileImageUrl());
        user.setBio(request.getBio());
        user.setRole(request.getRole());
        user.setPropertyId(request.getPropertyId());
        user.setMaintenanceOfficerType(request.getMaintenanceOfficerType());
        user.setMaintenanceCompanyName(request.getMaintenanceCompanyName());
        user.setContractorCompanyId(request.getContractorCompanyId());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        syncContractorDisplayName(user);
        normalizeRoleSpecificFields(user);
        User saved = userRepository.save(user);
        syncLinkedRoleMediaFromUserRequest(saved, request);
        syncTenantDisplayNameFromUser(saved);
        applyLinkPatchesFromUserRequest(saved, request);
        notifyEmployeePropertyAssignmentIfContextChanged(previousRole, previousPropertyId, saved);
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(toResponse(saved), saved));
    }

    @Transactional
    public UserResponse toggleActive(Long id) {
        User user = find(id);
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(toResponse(saved), saved));
    }

    @Transactional
    public void delete(Long id) {
        Long currentId = currentUserId();
        if (id.equals(currentId)) {
            throw AppException.badRequest("Cannot delete your own account.");
        }
        User user = find(id);
        removeLinkedRoleProfilesBeforeUserDelete(user);
        userRepository.delete(user);
    }

    /**
     * Unlinks or removes owner / tenant / employee rows tied to this login so the user row can be deleted.
     * Tenant: blocked if an ACTIVE lease exists; hard-removed when no lease rows; otherwise soft-deactivated.
     * Employee: hard-removed only when not assigned to a property ({@code propertyId} is null).
     */
    private void removeLinkedRoleProfilesBeforeUserDelete(User user) {
        Long userId = user.getId();
        ownerRepository.findByUserId(userId).ifPresent(o -> {
            o.setActive(false);
            o.setUserId(null);
            o.setPortalAccess(false);
            ownerRepository.save(o);
        });
        tenantRepository.findByUserId(userId).ifPresent(t -> removeTenantForUserDeletion(t));
        maintenanceProviderRepository.findByUserId(userId)
                .ifPresent(maintenanceProviderRepository::delete);
        removeEmployeeForUserDeletion(user);
        employeeRepository.clearLinkedUserId(userId);
    }

    private void removeTenantForUserDeletion(Tenant tenant) {
        Long tenantId = tenant.getId();
        if (leaseContractRepository.existsByTenantIdAndStatus(tenantId, ContractStatus.ACTIVE)) {
            throw AppException.badRequest("Cannot delete user linked to a tenant with an active lease contract");
        }
        Long unitId = tenant.getUnitId();
        if (canPhysicallyRemoveTenant(tenantId)) {
            maintenanceRequestRepository.clearTenantIdForTenant(tenantId);
            leaseContractService.syncUnitRentedFromContracts(unitId);
            tenantRepository.delete(tenant);
            return;
        }
        tenant.setActive(false);
        tenant.setUserId(null);
        tenant.setEmail(null);
        tenantRepository.save(tenant);
        leaseContractService.syncUnitRentedFromContracts(unitId);
    }

    private void removeEmployeeForUserDeletion(User user) {
        Optional<Employee> linked = employeeRepository.findByLinkedUserId(user.getId());
        if (linked.isPresent()) {
            Employee e = linked.get();
            assertEmployeeRemovable(e);
            employeeRepository.delete(e);
            return;
        }
        if (EMPLOYEE_ROLES.contains(user.getRole()) && user.getEmail() != null && !user.getEmail().isBlank()) {
            employeeRepository.findByEmailIgnoreCase(user.getEmail().trim()).ifPresent(e -> {
                if (e.getLinkedUserId() != null && !e.getLinkedUserId().equals(user.getId())) {
                    return;
                }
                assertEmployeeRemovable(e);
                employeeRepository.delete(e);
            });
        }
    }

    private static void assertEmployeeRemovable(Employee e) {
        if (e.getPropertyId() != null) {
            throw AppException.badRequest("Cannot delete user linked to an employee assigned to a property");
        }
    }

    private boolean canPhysicallyRemoveTenant(Long tenantId) {
        return !leaseContractRepository.existsByTenantId(tenantId)
                && !rentReceiptRepository.existsByTenantId(tenantId)
                && !contractActionRequestRepository.existsByTenantId(tenantId)
                && !rentPaymentRepository.existsByTenantId(tenantId)
                && !tenantComplaintRepository.existsByTenantId(tenantId);
    }

    @Transactional
    public UserResponse updateRole(Long id, UserRoleUpdateRequest request) {
        User user = find(id);
        LinkedHashSet<UserRole> selected = new LinkedHashSet<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            for (UserRole r : request.getRoles()) {
                if (r != null) {
                    selected.add(r);
                }
            }
        } else if (request.getRole() != null) {
            selected.add(request.getRole());
        } else {
            throw AppException.badRequest("role or roles is required");
        }
        if (selected.isEmpty()) {
            throw AppException.badRequest("At least one role is required");
        }
        UserRole primary = UserExtraRoles.pickPrimary(selected);
        user.setRole(primary);
        user.setExtraRoles(UserExtraRoles.formatExtras(primary, selected));
        normalizeRoleSpecificFields(user);
        User saved = userRepository.save(user);
        autoCreateOwnerRecord(saved);
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(toResponse(saved), saved));
    }

    @Transactional
    public UserResponse updateMyProfile(UserProfileUpdateRequest request) {
        User user = find(currentUserId());
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        if (request.getFullNameAr() != null && !request.getFullNameAr().isBlank()) {
            user.setFullNameAr(request.getFullNameAr().trim());
        }
        if (request.getFullNameEn() != null && !request.getFullNameEn().isBlank()) {
            user.setFullNameEn(request.getFullNameEn().trim());
        }
        user.setPhone(request.getPhone());
        user.setProfileImageUrl(request.getProfileImageUrl());
        user.setBio(request.getBio());
        User saved = userRepository.save(user);
        UserRequest rolePush = new UserRequest();
        rolePush.setProfileImageUrl(saved.getProfileImageUrl());
        rolePush.setPhone(saved.getPhone());
        syncLinkedRoleMediaFromUserRequest(saved, rolePush);
        syncTenantDisplayNameFromUser(saved);
        syncEmployeeDisplayNameFromUser(saved);
        applyLinkPatchesFromProfileUpdate(saved, request);
        syncLinkedRoleMediaFromProfileUpdate(saved, request);
        User reloaded = find(saved.getId());
        UserResponse base = toResponse(reloaded);
        return localizeDisplayName(portalProfileBridge.mergeRoleRecordIntoResponse(base, reloaded));
    }

    private UserResponse localizeDisplayName(UserResponse response) {
        if (response == null) {
            return null;
        }
        String displayName = LocalizedNameResolver.resolve(
                response.getFullNameAr(),
                response.getFullNameEn(),
                response.getFullName());
        return response.toBuilder().fullName(displayName).build();
    }

    @Transactional
    public void changeMyPassword(ChangePasswordRequest request) {
        User user = find(currentUserId());
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw AppException.badRequest("Current password is incorrect");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw AppException.badRequest("New password and confirmation do not match");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw AppException.badRequest("New password must be different from current password");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    private User find(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("User not found: " + id));
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .fullNameAr(u.getFullNameAr())
                .fullNameEn(u.getFullNameEn())
                .phone(u.getPhone())
                .profileImageUrl(u.getProfileImageUrl())
                .civilIdImageUrl(null)
                .leaseContractFiles(null)
                .bio(u.getBio())
                .role(u.getRole())
                .extraRoles(new ArrayList<>(u.getExtraRolesList()))
                .propertyId(u.getPropertyId())
                .maintenanceOfficerType(u.getMaintenanceOfficerType())
                .maintenanceCompanyName(u.getMaintenanceCompanyName())
                .contractorCompanyId(u.getContractorCompanyId())
                .active(u.isActive())
                .lastLogin(u.getLastLogin())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .createdBy(u.getCreatedBy())
                .createdByName(resolveUserName(u.getCreatedBy()))
                .modifiedBy(u.getModifiedBy())
                .modifiedByName(resolveUserName(u.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    /**
     * Pushes profile / civil ID / phone from a user admin request onto the linked owner, tenant, or employee row.
     * Null fields in the request mean "leave that attribute unchanged" on the role entity.
     */
    /**
     * Keeps the linked tenant row display name aligned with the portal user after profile edits.
     */
    private void syncTenantDisplayNameFromUser(User user) {
        if (user == null || user.getRole() != UserRole.TENANT) {
            return;
        }
        tenantRepository.findByUserId(user.getId()).ifPresent(t -> {
            t.setFullName(user.getFullName());
            t.setFullNameAr(firstNonBlank(user.getFullNameAr(), user.getFullName()));
            t.setFullNameEn(firstNonBlank(user.getFullNameEn(), user.getFullName()));
            tenantRepository.save(t);
        });
    }

    private void syncEmployeeDisplayNameFromUser(User user) {
        if (user == null || !EMPLOYEE_ROLES.contains(user.getRole()) || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        employeeRepository.findByEmailIgnoreCase(user.getEmail().trim()).ifPresent(e -> {
            e.setFullName(user.getFullName());
            e.setFullNameAr(firstNonBlank(user.getFullNameAr(), user.getFullName()));
            e.setFullNameEn(firstNonBlank(user.getFullNameEn(), user.getFullName()));
            employeeRepository.save(e);
        });
    }

    private void applyLinkPatchesFromProfileUpdate(User user, UserProfileUpdateRequest request) {
        if (user == null || request == null) {
            return;
        }
        switch (user.getRole()) {
            case OWNER -> applyOwnerLinkPatch(user, request.getOwnerLink());
            case TENANT -> applyTenantLinkPatch(user, request.getTenantLink());
            default -> {
                if (EMPLOYEE_ROLES.contains(user.getRole())) {
                    applyEmployeeLinkPatch(user, request.getEmployeeLink());
                }
            }
        }
    }

    /**
     * Civil ID and tenant lease files live on owner / tenant / employee rows ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â apply self-service profile updates.
     */
    private void syncLinkedRoleMediaFromProfileUpdate(User user, UserProfileUpdateRequest request) {
        if (user == null || request == null) {
            return;
        }
        if (request.getCivilIdImageUrl() == null && request.getLeaseContractFiles() == null) {
            return;
        }
        switch (user.getRole()) {
            case OWNER -> ownerRepository.findByUserId(user.getId()).ifPresent(o -> {
                if (request.getCivilIdImageUrl() != null) {
                    o.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
                }
                ownerRepository.save(o);
            });
            case TENANT -> tenantRepository.findByUserId(user.getId()).ifPresent(t -> {
                if (request.getCivilIdImageUrl() != null) {
                    t.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
                }
                if (request.getLeaseContractFiles() != null) {
                    t.setLeaseContractFiles(new java.util.ArrayList<>(normalizeProfileFileUrls(request.getLeaseContractFiles())));
                }
                tenantRepository.save(t);
            });
            default -> syncEmployeeCivilFromProfileIfPresent(user, request);
        }
    }

    private void syncEmployeeCivilFromProfileIfPresent(User user, UserProfileUpdateRequest request) {
        if (request.getCivilIdImageUrl() == null) {
            return;
        }
        if (!EMPLOYEE_ROLES.contains(user.getRole()) && user.getRole() != UserRole.SUPER_ADMIN) {
            return;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        employeeRepository.findByEmailIgnoreCase(user.getEmail().trim()).ifPresent(e -> {
            e.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
            employeeRepository.save(e);
        });
    }

    private static List<String> normalizeProfileFileUrls(List<String> files) {
        if (files == null) {
            return List.of();
        }
        return files.stream()
                .map(f -> f == null ? "" : f.trim())
                .filter(f -> !f.isEmpty())
                .distinct()
                .toList();
    }

    private void applyLinkPatchesFromUserRequest(User user, UserRequest request) {
        if (user == null || request == null) {
            return;
        }
        switch (user.getRole()) {
            case OWNER -> applyOwnerLinkPatch(user, request.getOwnerLink());
            case TENANT -> applyTenantLinkPatch(user, request.getTenantLink());
            default -> {
                if (EMPLOYEE_ROLES.contains(user.getRole())) {
                    applyEmployeeLinkPatch(user, request.getEmployeeLink());
                }
            }
        }
    }

    private void applyOwnerLinkPatch(User user, OwnerProfileLinkDto dto) {
        if (dto == null) {
            return;
        }
        ownerRepository.findByUserId(user.getId()).ifPresent(o -> {
            boolean nameChanged = patchOwnerFields(o, dto);
            ownerRepository.save(o);
            if (nameChanged) {
                User u = find(user.getId());
                u.setFullName(o.getFullName());
                userRepository.save(u);
            }
        });
    }

    private boolean patchOwnerFields(Owner o, OwnerProfileLinkDto dto) {
        boolean recompute = false;
        if (dto.getFullNameAr() != null && !dto.getFullNameAr().isBlank()) {
            o.setFullNameAr(dto.getFullNameAr().trim());
            recompute = true;
        }
        if (dto.getFullNameEn() != null && !dto.getFullNameEn().isBlank()) {
            o.setFullNameEn(dto.getFullNameEn().trim());
            recompute = true;
        }
        if (recompute) {
            o.setFullName(ownerCompositeLine(o.getFullNameAr(), o.getFullNameEn()));
        }
        if (dto.getNationalId() != null) {
            String nid = trimToNull(dto.getNationalId());
            if (nid != null && ownerRepository.existsByNationalIdAndIdNot(nid, o.getId())) {
                throw AppException.conflict("National ID already registered: " + nid);
            }
            o.setNationalId(nid); // also clears when payload is blank after trim
        }
        if (dto.getAddress() != null) {
            o.setAddress(trimToNull(dto.getAddress()));
        }
        if (dto.getNotes() != null) {
            o.setNotes(trimToNull(dto.getNotes()));
        }
        return recompute;
    }

    private void applyTenantLinkPatch(User user, TenantProfileLinkDto dto) {
        if (dto == null) {
            return;
        }
        tenantRepository.findByUserId(user.getId()).ifPresent(t -> {
            if (dto.getNationalId() != null) {
                t.setNationalId(trimToNull(dto.getNationalId()));
            }
            t.setLeaseStart(dto.getLeaseStart());
            t.setLeaseEnd(dto.getLeaseEnd());
            if (dto.getNotes() != null) {
                t.setNotes(trimToNull(dto.getNotes()));
            }
            validateTenantLeaseWindow(t.getLeaseStart(), t.getLeaseEnd());
            tenantRepository.save(t);
        });
    }

    private static void validateTenantLeaseWindow(LocalDate start, LocalDate end) {
        if (start != null && end != null && start.isAfter(end)) {
            throw AppException.badRequest("Lease start must be on or before lease end");
        }
    }

    private void applyEmployeeLinkPatch(User user, EmployeeProfileLinkDto dto) {
        if (dto == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        employeeRepository.findByEmailIgnoreCase(user.getEmail().trim()).ifPresent(e -> {
            if (dto.getNationalId() != null) {
                e.setNationalId(trimToNull(dto.getNationalId()));
            }
            if (dto.getJobTitleAr() != null) {
                e.setJobTitleAr(trimToNull(dto.getJobTitleAr()));
            }
            if (dto.getJobTitleEn() != null) {
                e.setJobTitleEn(trimToNull(dto.getJobTitleEn()));
            }
            employeeRepository.save(e);
        });
    }

    private static String ownerCompositeLine(String ar, String en) {
        String a = ar == null ? "" : ar.trim();
        String e = en == null ? "" : en.trim();
        if (a.isEmpty()) {
            return e;
        }
        if (e.isEmpty()) {
            return a;
        }
        if (a.equals(e)) {
            return a;
        }
        return a + " / " + e;
    }

    private void syncLinkedRoleMediaFromUserRequest(User user, UserRequest request) {
        if (user == null || request == null) {
            return;
        }
        switch (user.getRole()) {
            case OWNER -> ownerRepository.findByUserId(user.getId()).ifPresent(o -> {
                if (request.getProfileImageUrl() != null) {
                    o.setProfileImageUrl(trimToNull(request.getProfileImageUrl()));
                }
                if (request.getCivilIdImageUrl() != null) {
                    o.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
                }
                if (request.getPhone() != null) {
                    o.setPhone(trimToNull(request.getPhone()));
                }
                ownerRepository.save(o);
            });
            case TENANT -> tenantRepository.findByUserId(user.getId()).ifPresent(t -> {
                if (request.getProfileImageUrl() != null) {
                    t.setProfileImage(trimToNull(request.getProfileImageUrl()));
                }
                if (request.getCivilIdImageUrl() != null) {
                    t.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
                }
                if (request.getPhone() != null) {
                    String ph = trimToNull(request.getPhone());
                    if (ph != null) {
                        t.setPhone(ph);
                    }
                }
                tenantRepository.save(t);
            });
            default -> {
                if (EMPLOYEE_ROLES.contains(user.getRole())
                        && user.getEmail() != null
                        && !user.getEmail().isBlank()) {
                    employeeRepository.findByEmailIgnoreCase(user.getEmail().trim()).ifPresent(e -> {
                        if (request.getProfileImageUrl() != null) {
                            e.setProfileImageUrl(trimToNull(request.getProfileImageUrl()));
                        }
                        if (request.getCivilIdImageUrl() != null) {
                            e.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
                        }
                        if (request.getPhone() != null) {
                            e.setPhone(trimToNull(request.getPhone()));
                        }
                        employeeRepository.save(e);
                    });
                }
            }
        }
    }

    private void validateMaintenanceOfficerDetails(UserRequest request) {
        if (request.getRole() == UserRole.MAINTENANCE_COMPANY) {
            if (request.getContractorCompanyId() == null) {
                throw AppException.badRequest("contractorCompanyId is required for maintenance company users");
            }
            if (!contractorCompanyRepository.existsById(request.getContractorCompanyId())) {
                throw AppException.badRequest("Contractor company not found: " + request.getContractorCompanyId());
            }
            return;
        }
        if (!UserRole.isMaintenanceOfficer(request.getRole())) {
            return;
        }
        if (request.getMaintenanceOfficerType() == null) {
            throw AppException.badRequest("Maintenance officer type is required");
        }
        if (request.getMaintenanceOfficerType() == MaintenanceOfficerType.CONTRACTOR_COMPANY) {
            if (request.getContractorCompanyId() == null) {
                throw AppException.badRequest("contractorCompanyId is required for contractor maintenance officers");
            }
            if (!contractorCompanyRepository.existsById(request.getContractorCompanyId())) {
                throw AppException.badRequest("Contractor company not found: " + request.getContractorCompanyId());
            }
        }
    }

    public List<UserResponse> findAssignableContractorOfficers(Long propertyId, Long contractorCompanyId) {
        User caller = requireCallerUser();
        if (caller.getRole() == UserRole.MAINTENANCE_COMPANY) {
            if (caller.getContractorCompanyId() == null
                    || caller.getPropertyId() == null
                    || !caller.getContractorCompanyId().equals(contractorCompanyId)
                    || !caller.getPropertyId().equals(propertyId)) {
                throw AppException.forbidden("Access denied");
            }
        } else if (caller.getRole() != UserRole.SUPER_ADMIN && caller.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Access denied");
        }
        return userRepository
                .findAssignableContractorOfficers(
                        UserRole.MAINTENANCE_COMPANY, propertyId, contractorCompanyId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private void normalizeRoleSpecificFields(User user) {
        if (user.getRole() == UserRole.MAINTENANCE_COMPANY) {
            user.setMaintenanceOfficerType(MaintenanceOfficerType.CONTRACTOR_COMPANY);
            return;
        }
        if (!UserRole.isMaintenanceOfficer(user.getRole())) {
            user.setMaintenanceOfficerType(null);
            user.setMaintenanceCompanyName(null);
            user.setContractorCompanyId(null);
            return;
        }
        if (user.getRole() == UserRole.MAINTENANCE_OFFICER_INTERNAL) {
            user.setMaintenanceOfficerType(MaintenanceOfficerType.INTERNAL_PROPERTY);
        } else if (user.getRole() == UserRole.MAINTENANCE_OFFICER_COMPANY) {
            user.setMaintenanceOfficerType(MaintenanceOfficerType.CONTRACTOR_COMPANY);
        }
        if (user.getMaintenanceOfficerType() != MaintenanceOfficerType.CONTRACTOR_COMPANY) {
            user.setMaintenanceCompanyName(null);
            user.setContractorCompanyId(null);
        }
    }

    private void syncContractorDisplayName(User user) {
        boolean contractorLogin = UserRole.isMaintenanceCompany(user.getRole())
                || (UserRole.isMaintenanceOfficer(user.getRole())
                    && user.getMaintenanceOfficerType() == MaintenanceOfficerType.CONTRACTOR_COMPANY);
        if (!contractorLogin || user.getContractorCompanyId() == null) {
            return;
        }
        ContractorCompanyEntity cc = contractorCompanyRepository.findById(user.getContractorCompanyId()).orElse(null);
        if (cc != null) {
            String label = firstNonBlank(cc.getNameAr(), cc.getNameEn(), cc.getName());
            if (label != null) {
                user.setMaintenanceCompanyName(label);
            }
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private String defaultPasswordFor(UserRequest request) {
        return defaultUserPassword;
    }

    private User requireCallerUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private Long currentUserId() {
        return requireCallerUser().getId();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
