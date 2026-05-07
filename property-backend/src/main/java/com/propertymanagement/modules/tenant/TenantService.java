package com.propertymanagement.modules.tenant;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.lease.LeaseContractService;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.complaint.TenantComplaintRepository;
import com.propertymanagement.modules.contract.payment.RentPaymentRepository;
import com.propertymanagement.modules.tenantportal.ContractActionRequestRepository;
import com.propertymanagement.modules.tenantportal.RentReceiptRepository;
import com.propertymanagement.modules.tenant.dto.TenantRequest;
import com.propertymanagement.modules.tenant.dto.TenantResponse;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.unit.Unit;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.BilingualNotificationText;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TenantService {
    private static final String DEFAULT_TENANT_PASSWORD = "12345";

    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;
    private final LeaseContractRepository leaseContractRepository;
    private final LeaseContractService leaseContractService;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final RentReceiptRepository rentReceiptRepository;
    private final ContractActionRequestRepository contractActionRequestRepository;
    private final RentPaymentRepository rentPaymentRepository;
    private final TenantComplaintRepository tenantComplaintRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final TenantPortalWelcomeService tenantPortalWelcomeService;
    private final PropertyScopeService propertyScopeService;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final PropertyRepository propertyRepository;

    public Page<TenantResponse> getAll(Pageable pageable, String q, Long propertyId) {
        String trimmed = trimToNull(q);
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (scope != null) {
            if (scope.isEmpty()) {
                return Page.empty(pageable);
            }
            if (propertyId != null) {
                return scope.contains(propertyId)
                        ? tenantRepository.searchActive(trimmed, propertyId, pageable).map(this::toResponse)
                        : Page.empty(pageable);
            }
            return tenantRepository.searchActiveInPropertyIds(trimmed, scope, pageable).map(this::toResponse);
        }
        return tenantRepository.searchActive(trimmed, propertyId, pageable).map(this::toResponse);
    }

    public TenantResponse getById(Long id) {
        Tenant tenant = findActive(id);
        assertCanAccessProperty(tenant.getPropertyId());
        return toResponse(tenant);
    }

    public TenantResponse getByUserId(Long userId) {
        return tenantRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> AppException.notFound("Tenant profile not found for user: " + userId));
    }

    public TenantResponse getByUnitId(Long unitId) {
        Tenant tenant = tenantRepository.findByUnitIdAndActiveTrue(unitId)
                .orElseThrow(() -> AppException.notFound("No active tenant for unit: " + unitId));
        assertCanAccessProperty(tenant.getPropertyId());
        return toResponse(tenant);
    }

    @Transactional
    public TenantResponse create(TenantRequest request) {
        validateScope(request);
        validateLease(request);
        Long targetPropertyId = resolveTargetPropertyId(request);
        assertCanAccessProperty(targetPropertyId);
        requirePropertyHasAccountant(targetPropertyId);
        String email = trimToNull(request.getEmail());
        Long userId = request.getUserId();

        Optional<Tenant> existingByUserId = userId != null ? tenantRepository.findByUserId(userId) : Optional.empty();
        if (existingByUserId.isPresent()) {
            Tenant tenant = existingByUserId.get();
            Long previousPortalUserId = tenant.getUserId();
            String previousEmail = trimToNull(tenant.getEmail());
            if (email != null && !email.equals(previousEmail) && tenantRepository.existsByEmail(email)) {
                throw AppException.conflict("Email already registered: " + email, "EMAIL_ALREADY_USED");
            }
            Long previousUnitId = tenant.getUnitId();

            tenant.setFullName(request.getFullName());
            tenant.setFullNameAr(request.getFullNameAr());
            tenant.setFullNameEn(request.getFullNameEn());
            tenant.setUnitId(request.getUnitId());
            tenant.setPropertyId(request.getPropertyId());
            tenant.setNationalId(request.getNationalId());
            tenant.setPhone(request.getPhone());
            tenant.setLeaseStart(request.getLeaseStart());
            tenant.setLeaseEnd(request.getLeaseEnd());
            tenant.setProfileImage(request.getProfileImage());
            tenant.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
            tenant.setLeaseContractFiles(normalizeFiles(request.getLeaseContractFiles()));
            tenant.setNotes(request.getNotes());
            tenant.setEmail(email);
            tenant.setActive(true);

            if (tenant.getUserId() == null && email != null) {
                User user = ensureTenantPortalUser(
                        email,
                        request.getFullName(),
                        firstNonBlank(request.getPhone(), tenant.getPhone()),
                        tenant.getId());
                syncTenantPortalUserFromRequest(user, request);
                tenant.setUserId(user.getId());
            }

            Tenant saved = tenantRepository.save(tenant);
            if (saved.getUserId() != null) {
                userRepository.findById(saved.getUserId()).ifPresent(u -> {
                    syncTenantPortalUserFromRequest(u, request);
                    syncTenantPortalLoginEmail(u, email);
                });
            }
            if (previousUnitId != null && !previousUnitId.equals(request.getUnitId())) {
                refreshUnitOccupancyFromLeases(previousUnitId);
            }
            refreshUnitOccupancyFromLeases(request.getUnitId());
            if (saved.getUserId() != null && previousPortalUserId == null) {
                tenantPortalWelcomeService.notifyTenantPortalLinked(saved);
            }
            if (saved.getPropertyId() != null && saved.getUnitId() != null
                    && !Objects.equals(previousUnitId, saved.getUnitId())) {
                notifyOwnersTenantRegisteredOnUnit(saved);
            }
            return toResponse(saved);
        }

        if (email != null && tenantRepository.existsByEmail(email)) {
            throw AppException.conflict("Email already registered: " + email, "EMAIL_ALREADY_USED");
        }

        Tenant tenant = Tenant.builder()
                .fullName(request.getFullName())
                .fullNameAr(request.getFullNameAr())
                .fullNameEn(request.getFullNameEn())
                .unitId(request.getUnitId())
                .propertyId(request.getPropertyId())
                .userId(request.getUserId())
                .nationalId(request.getNationalId())
                .phone(request.getPhone())
                .email(email)
                .leaseStart(request.getLeaseStart())
                .leaseEnd(request.getLeaseEnd())
                .profileImage(request.getProfileImage())
                .civilIdImageUrl(trimToNull(request.getCivilIdImageUrl()))
                .leaseContractFiles(normalizeFiles(request.getLeaseContractFiles()))
                .notes(request.getNotes())
                .active(true)
                .build();

        if (email != null && tenant.getUserId() == null) {
            User user = ensureTenantPortalUser(email, request.getFullName(), request.getPhone(), null);
            syncTenantPortalUserFromRequest(user, request);
            tenant.setUserId(user.getId());
        } else if (tenant.getUserId() != null) {
            userRepository.findById(tenant.getUserId()).ifPresent(u -> {
                syncTenantPortalUserFromRequest(u, request);
                syncTenantPortalLoginEmail(u, email);
            });
        }

        Tenant saved = tenantRepository.save(tenant);
        if (saved.getUserId() != null) {
            userRepository.findById(saved.getUserId()).ifPresent(u -> {
                syncTenantPortalUserFromRequest(u, request);
                syncTenantPortalLoginEmail(u, email);
            });
        }
        refreshUnitOccupancyFromLeases(request.getUnitId());
        if (saved.getUserId() != null) {
            tenantPortalWelcomeService.notifyTenantPortalLinked(saved);
        }
        if (saved.getPropertyId() != null && saved.getUnitId() != null) {
            notifyOwnersTenantRegisteredOnUnit(saved);
        }
        return toResponse(saved);
    }

    private void notifyOwnersTenantRegisteredOnUnit(Tenant tenant) {
        if (tenant == null || tenant.getPropertyId() == null || tenant.getUnitId() == null) {
            return;
        }
        List<Long> recipients = propertyOwnerPortalRecipientService.portalRecipientUserIds(tenant.getPropertyId());
        if (recipients.isEmpty()) {
            return;
        }
        try {
            Property property = propertyRepository.findById(tenant.getPropertyId()).filter(Property::isActive).orElse(null);
            if (property == null) {
                return;
            }
            String unitNumber = unitRepository.findById(tenant.getUnitId()).map(Unit::getUnitNumber).orElse("");
            String tenantName = BilingualNotificationText.composite(
                    tenant.getFullNameAr(), tenant.getFullNameEn(), tenant.getFullName());
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put(
                    "propertyName",
                    BilingualNotificationText.composite(
                            property.getPropertyNameAr(),
                            property.getPropertyNameEn(),
                            property.getPropertyName()));
            vars.put("unitNumber", unitNumber != null ? unitNumber : "");
            vars.put("tenantName", tenantName != null ? tenantName : "");
            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("tenantId", tenant.getId());
            hints.put("unitId", tenant.getUnitId());
            hints.put("propertyId", tenant.getPropertyId());
            notificationService.createLocalized(
                    recipients,
                    currentActorUserId(),
                    tenant.getPropertyId(),
                    null,
                    NotificationType.TENANT_REGISTERED_ON_OWNER_PROPERTY,
                    "NOTIFICATIONS.TENANT_REGISTERED_TITLE",
                    "NOTIFICATIONS.TENANT_REGISTERED_OWNER_BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // Side-effect: tenant save must succeed even if notification persistence fails.
        }
    }

    private Long currentActorUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) {
                return u.getId();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Transactional
    public TenantResponse update(Long id, TenantRequest request) {
        validateScope(request);
        validateLease(request);
        Long targetPropertyId = resolveTargetPropertyId(request);
        assertCanAccessProperty(targetPropertyId);
        requirePropertyHasAccountant(targetPropertyId);
        Tenant tenant = findActive(id);
        assertCanAccessProperty(tenant.getPropertyId());
        Long previousUserId = tenant.getUserId();

        String email = trimToNull(request.getEmail());
        String previousEmail = trimToNull(tenant.getEmail());
        if (email != null && !email.equals(previousEmail) && tenantRepository.existsByEmail(email)) {
            throw AppException.conflict("Email already registered: " + email, "EMAIL_ALREADY_USED");
        }

        Long previousUnitId = tenant.getUnitId();
        Long previousPropertyId = tenant.getPropertyId();

        tenant.setFullName(request.getFullName());
        tenant.setFullNameAr(request.getFullNameAr());
        tenant.setFullNameEn(request.getFullNameEn());
        tenant.setUnitId(request.getUnitId());
        tenant.setPropertyId(request.getPropertyId());
        tenant.setNationalId(request.getNationalId());
        tenant.setPhone(request.getPhone());
        tenant.setLeaseStart(request.getLeaseStart());
        tenant.setLeaseEnd(request.getLeaseEnd());
        tenant.setProfileImage(request.getProfileImage());
        tenant.setCivilIdImageUrl(trimToNull(request.getCivilIdImageUrl()));
        tenant.setLeaseContractFiles(normalizeFiles(request.getLeaseContractFiles()));
        tenant.setNotes(request.getNotes());

        if (tenant.getUserId() == null && email != null) {
            User user = ensureTenantPortalUser(
                    email,
                    request.getFullName(),
                    firstNonBlank(request.getPhone(), tenant.getPhone()),
                    tenant.getId());
            syncTenantPortalUserFromRequest(user, request);
            tenant.setUserId(user.getId());
        }
        tenant.setEmail(email);

        Tenant saved = tenantRepository.save(tenant);
        if (saved.getUserId() != null) {
            userRepository.findById(saved.getUserId()).ifPresent(u -> {
                syncTenantPortalUserFromRequest(u, request);
                syncTenantPortalLoginEmail(u, email);
            });
        }

        if (previousUnitId != null && !previousUnitId.equals(request.getUnitId())) {
            refreshUnitOccupancyFromLeases(previousUnitId);
        }
        refreshUnitOccupancyFromLeases(request.getUnitId());

        if (saved.getUserId() != null && previousUserId == null) {
            tenantPortalWelcomeService.notifyTenantPortalLinked(saved);
        }
        if (saved.getPropertyId() != null && saved.getUnitId() != null
                && (!Objects.equals(previousUnitId, saved.getUnitId())
                        || !Objects.equals(previousPropertyId, saved.getPropertyId()))) {
            notifyOwnersTenantRegisteredOnUnit(saved);
        }
        return toResponse(saved);
    }

    @Transactional
    public TenantResponse unlinkUnit(Long id) {
        Tenant tenant = findActive(id);
        assertCanAccessProperty(tenant.getPropertyId());
        Long previousUnitId = tenant.getUnitId();
        tenant.setUnitId(null);
        Tenant saved = tenantRepository.save(tenant);
        refreshUnitOccupancyFromLeases(previousUnitId);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Tenant tenant = findActive(id);
        assertCanAccessProperty(tenant.getPropertyId());
        if (leaseContractRepository.existsByTenantIdAndStatus(id, ContractStatus.ACTIVE)) {
            throw AppException.badRequest("Cannot delete tenant while an active lease contract exists");
        }
        Long portalUserId = tenant.getUserId();
        Long unitId = tenant.getUnitId();
        if (canPhysicallyRemoveTenant(id)) {
            maintenanceRequestRepository.clearTenantIdForTenant(id);
            refreshUnitOccupancyFromLeases(unitId);
            tenantRepository.delete(tenant);
            if (portalUserId != null) {
                userService.delete(portalUserId);
            }
            return;
        }
        tenant.setActive(false);
        tenant.setUserId(null);
        // Row stays for history/FKs; clear email so UNIQUE(tenants.email) does not block new tenants.
        tenant.setEmail(null);
        tenantRepository.save(tenant);
        refreshUnitOccupancyFromLeases(unitId);
        if (portalUserId != null) {
            userService.delete(portalUserId);
        }
    }

    private boolean canPhysicallyRemoveTenant(Long tenantId) {
        return !leaseContractRepository.existsByTenantId(tenantId)
                && !rentReceiptRepository.existsByTenantId(tenantId)
                && !contractActionRequestRepository.existsByTenantId(tenantId)
                && !rentPaymentRepository.existsByTenantId(tenantId)
                && !tenantComplaintRepository.existsByTenantId(tenantId);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }

    private static String resolveTenantDisplayName(Tenant t) {
        return LocalizedNameResolver.resolve(
                t.getFullNameAr(),
                t.getFullNameEn(),
                t.getFullName());
    }

    private void syncTenantPortalUserFromRequest(User user, TenantRequest request) {
        boolean dirty = false;
        if (request.getProfileImage() != null && !request.getProfileImage().isBlank()) {
            user.setProfileImageUrl(request.getProfileImage().trim());
            dirty = true;
        }
        if (request.getCivilIdImageUrl() != null && !request.getCivilIdImageUrl().isBlank()) {
            user.setCivilIdImageUrl(request.getCivilIdImageUrl().trim());
            dirty = true;
        }
        if (request.getPropertyId() != null) {
            user.setPropertyId(request.getPropertyId());
            dirty = true;
        }
        if (dirty) {
            userRepository.save(user);
        }
    }

    /**
     * Keeps {@code users.email}/{@code username} aligned with {@code tenants.email} so the address
     * shown on contracts matches portal login. Previously only the tenant row was updated.
     */
    private void syncTenantPortalLoginEmail(User portalUser, String tenantEmail) {
        if (portalUser == null || tenantEmail == null || tenantEmail.isBlank()) {
            return;
        }
        String normalized = tenantEmail.trim();
        if (normalized.equals(portalUser.getEmail()) && normalized.equals(portalUser.getUsername())) {
            return;
        }
        userRepository.findByEmail(normalized).ifPresent(other -> {
            if (!other.getId().equals(portalUser.getId())) {
                throw AppException.conflict("Email already in use by another account: " + normalized, "EMAIL_ALREADY_USED");
            }
        });
        portalUser.setEmail(normalized);
        portalUser.setUsername(normalized);
        userRepository.save(portalUser);
    }

    /**
     * Creates or reuses a TENANT user for portal login; refuses emails already used by non-tenants
     * and users already linked to another tenant row.
     */
    private User ensureTenantPortalUser(String email, String fullName, String phone, Long currentTenantIdOrNull) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getRole() != UserRole.TENANT) {
                throw AppException.conflict("Email already registered to a non-tenant account: " + email, "EMAIL_USED_BY_DIFFERENT_ROLE");
            }
            assertTenantUserNotLinkedToOther(u.getId(), currentTenantIdOrNull);
            return u;
        }
        return userRepository.save(User.builder()
                .username(email)
                .email(email)
                .password(passwordEncoder.encode(DEFAULT_TENANT_PASSWORD))
                .fullName(fullName)
                .phone(phone)
                .role(UserRole.TENANT)
                .active(true)
                .build());
    }

    private void assertTenantUserNotLinkedToOther(Long userId, Long currentTenantIdOrNull) {
        tenantRepository.findByUserId(userId).ifPresent(other -> {
            if (currentTenantIdOrNull == null || !other.getId().equals(currentTenantIdOrNull)) {
                throw AppException.conflict("This portal account is already linked to another tenant");
            }
        });
    }

    private void validateScope(TenantRequest request) {
        if (request.getUnitId() == null && request.getPropertyId() == null) {
            throw AppException.badRequest("Tenant must be assigned to a unit or a property");
        }
    }

    private Long resolveTargetPropertyId(TenantRequest request) {
        if (request.getPropertyId() != null) {
            return request.getPropertyId();
        }
        if (request.getUnitId() != null) {
            return unitRepository.findById(request.getUnitId())
                    .map(Unit::getPropertyId)
                    .orElseThrow(() -> AppException.badRequest("Unit not found: " + request.getUnitId()));
        }
        return null;
    }

    private void assertCanAccessProperty(Long propertyId) {
        if (!propertyScopeService.canAccessProperty(propertyId)) {
            throw AppException.forbidden("You do not have access to this property");
        }
    }

    private void requirePropertyHasAccountant(Long propertyId) {
        if (propertyId == null) {
            return;
        }
        boolean hasPropertyAccountant = !userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT).isEmpty();
        if (!hasPropertyAccountant) {
            throw AppException.badRequest("Assign an active accountant to this property before registering tenants");
        }
    }

    private void validateLease(TenantRequest request) {
        if (request.getLeaseStart() == null || request.getLeaseEnd() == null) {
            throw AppException.badRequest("Lease period (start/end) is required");
        }
        if (request.getLeaseEnd().isBefore(request.getLeaseStart())) {
            throw AppException.badRequest("Lease end date must be on or after lease start date");
        }
        List<String> files = normalizeFiles(request.getLeaseContractFiles());
        if (files.isEmpty()) {
            throw AppException.badRequest("At least one lease contract attachment is required");
        }
    }

    private List<String> normalizeFiles(List<String> files) {
        if (files == null) return List.of();
        return files.stream()
                .map((f) -> f == null ? "" : f.trim())
                .filter((f) -> !f.isEmpty())
                .distinct()
                .toList();
    }

    private void refreshUnitOccupancyFromLeases(Long unitId) {
        if (unitId != null) {
            leaseContractService.syncUnitRentedFromContracts(unitId);
        }
    }

    private Tenant findActive(Long id) {
        return tenantRepository.findById(id)
                .filter(Tenant::isActive)
                .orElseThrow(() -> AppException.notFound("Tenant not found: " + id));
    }

    private boolean resolveLinkedUserActive(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.findById(userId).map(User::isActive).orElse(false);
    }

    private TenantResponse toResponse(Tenant t) {
        return TenantResponse.builder()
                .id(t.getId())
                .userId(t.getUserId())
                .linkedUserActive(resolveLinkedUserActive(t.getUserId()))
                .unitId(t.getUnitId())
                .propertyId(t.getPropertyId())
                .fullName(resolveTenantDisplayName(t))
                .fullNameAr(t.getFullNameAr())
                .fullNameEn(t.getFullNameEn())
                .nationalId(t.getNationalId())
                .phone(t.getPhone())
                .email(t.getEmail())
                .leaseStart(t.getLeaseStart())
                .leaseEnd(t.getLeaseEnd())
                .profileImage(t.getProfileImage())
                .civilIdImageUrl(t.getCivilIdImageUrl())
                .leaseContractFiles(t.getLeaseContractFiles())
                .notes(t.getNotes())
                .active(t.isActive())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .createdBy(t.getCreatedBy())
                .createdByName(resolveUserName(t.getCreatedBy()))
                .modifiedBy(t.getModifiedBy())
                .modifiedByName(resolveUserName(t.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
