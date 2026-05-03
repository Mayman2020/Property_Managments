package com.propertymanagement.modules.tenant;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.maintenance.request.MaintenanceRequestRepository;
import com.propertymanagement.modules.complaint.TenantComplaintRepository;
import com.propertymanagement.modules.contract.payment.RentPaymentRepository;
import com.propertymanagement.modules.tenantportal.ContractActionRequestRepository;
import com.propertymanagement.modules.tenantportal.RentReceiptRepository;
import com.propertymanagement.modules.violation.TenantViolationRepository;
import com.propertymanagement.modules.tenant.dto.TenantRequest;
import com.propertymanagement.modules.tenant.dto.TenantResponse;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.user.UserService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;
    private final LeaseContractRepository leaseContractRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final RentReceiptRepository rentReceiptRepository;
    private final ContractActionRequestRepository contractActionRequestRepository;
    private final RentPaymentRepository rentPaymentRepository;
    private final TenantViolationRepository tenantViolationRepository;
    private final TenantComplaintRepository tenantComplaintRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public Page<TenantResponse> getAll(Pageable pageable, String q, Long propertyId) {
        return tenantRepository.searchActive(trimToNull(q), propertyId, pageable).map(this::toResponse);
    }

    public TenantResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    public TenantResponse getByUserId(Long userId) {
        return tenantRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> AppException.notFound("Tenant profile not found for user: " + userId));
    }

    public TenantResponse getByUnitId(Long unitId) {
        return tenantRepository.findByUnitIdAndActiveTrue(unitId)
                .map(this::toResponse)
                .orElseThrow(() -> AppException.notFound("No active tenant for unit: " + unitId));
    }

    @Transactional
    public TenantResponse create(TenantRequest request) {
        validateScope(request);
        validateLease(request);
        String email = trimToNull(request.getEmail());
        Long userId = request.getUserId();

        Optional<Tenant> existingByUserId = userId != null ? tenantRepository.findByUserId(userId) : Optional.empty();
        if (existingByUserId.isPresent()) {
            Tenant tenant = existingByUserId.get();
            String previousEmail = trimToNull(tenant.getEmail());
            if (email != null && !email.equals(previousEmail) && tenantRepository.existsByEmail(email)) {
                throw AppException.conflict("Email already registered: " + email);
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
                userRepository.findById(saved.getUserId()).ifPresent(u -> syncTenantPortalUserFromRequest(u, request));
            }
            if (previousUnitId != null && !previousUnitId.equals(request.getUnitId())) {
                markUnitRented(previousUnitId, false);
            }
            markUnitRented(request.getUnitId(), true);
            return toResponse(saved);
        }

        if (email != null && tenantRepository.existsByEmail(email)) {
            throw AppException.conflict("Email already registered: " + email);
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
                .leaseContractFiles(normalizeFiles(request.getLeaseContractFiles()))
                .notes(request.getNotes())
                .active(true)
                .build();

        if (email != null && tenant.getUserId() == null) {
            User user = ensureTenantPortalUser(email, request.getFullName(), request.getPhone(), null);
            syncTenantPortalUserFromRequest(user, request);
            tenant.setUserId(user.getId());
        } else if (tenant.getUserId() != null) {
            userRepository.findById(tenant.getUserId()).ifPresent(u -> syncTenantPortalUserFromRequest(u, request));
        }

        Tenant saved = tenantRepository.save(tenant);
        markUnitRented(request.getUnitId(), true);
        return toResponse(saved);
    }

    @Transactional
    public TenantResponse update(Long id, TenantRequest request) {
        validateScope(request);
        validateLease(request);
        Tenant tenant = findActive(id);

        String email = trimToNull(request.getEmail());
        String previousEmail = trimToNull(tenant.getEmail());
        if (email != null && !email.equals(previousEmail) && tenantRepository.existsByEmail(email)) {
            throw AppException.conflict("Email already registered: " + email);
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
            userRepository.findById(saved.getUserId()).ifPresent(u -> syncTenantPortalUserFromRequest(u, request));
        }

        if (previousUnitId != null && !previousUnitId.equals(request.getUnitId())) {
            markUnitRented(previousUnitId, false);
        }
        markUnitRented(request.getUnitId(), true);

        return toResponse(saved);
    }

    @Transactional
    public TenantResponse unlinkUnit(Long id) {
        Tenant tenant = findActive(id);
        Long previousUnitId = tenant.getUnitId();
        tenant.setUnitId(null);
        Tenant saved = tenantRepository.save(tenant);
        markUnitRented(previousUnitId, false);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Tenant tenant = findActive(id);
        if (leaseContractRepository.existsByTenantIdAndStatus(id, ContractStatus.ACTIVE)) {
            throw AppException.badRequest("Cannot delete tenant while an active lease contract exists");
        }
        Long portalUserId = tenant.getUserId();
        Long unitId = tenant.getUnitId();
        if (canPhysicallyRemoveTenant(id)) {
            maintenanceRequestRepository.clearTenantIdForTenant(id);
            markUnitRented(unitId, false);
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
        markUnitRented(unitId, false);
        if (portalUserId != null) {
            userService.delete(portalUserId);
        }
    }

    private boolean canPhysicallyRemoveTenant(Long tenantId) {
        return !leaseContractRepository.existsByTenantId(tenantId)
                && !rentReceiptRepository.existsByTenantId(tenantId)
                && !contractActionRequestRepository.existsByTenantId(tenantId)
                && !rentPaymentRepository.existsByTenantId(tenantId)
                && !tenantViolationRepository.existsByTenantId(tenantId)
                && !tenantComplaintRepository.existsByTenantId(tenantId);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }

    private void syncTenantPortalUserFromRequest(User user, TenantRequest request) {
        boolean dirty = false;
        if (request.getProfileImage() != null && !request.getProfileImage().isBlank()) {
            user.setProfileImageUrl(request.getProfileImage().trim());
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
     * Creates or reuses a TENANT user for portal login; refuses emails already used by non-tenants
     * and users already linked to another tenant row.
     */
    private User ensureTenantPortalUser(String email, String fullName, String phone, Long currentTenantIdOrNull) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getRole() != UserRole.TENANT) {
                throw AppException.conflict("Email already registered to a non-tenant account: " + email);
            }
            assertTenantUserNotLinkedToOther(u.getId(), currentTenantIdOrNull);
            return u;
        }
        return userRepository.save(User.builder()
                .username(email)
                .email(email)
                .password(passwordEncoder.encode("12345"))
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

    private void markUnitRented(Long unitId, boolean rented) {
        if (unitId == null) return;
        unitRepository.findById(unitId).ifPresent(u -> {
            u.setRented(rented);
            unitRepository.save(u);
        });
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
                .fullName(t.getFullName())
                .fullNameAr(t.getFullNameAr())
                .fullNameEn(t.getFullNameEn())
                .nationalId(t.getNationalId())
                .phone(t.getPhone())
                .email(t.getEmail())
                .leaseStart(t.getLeaseStart())
                .leaseEnd(t.getLeaseEnd())
                .profileImage(t.getProfileImage())
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
