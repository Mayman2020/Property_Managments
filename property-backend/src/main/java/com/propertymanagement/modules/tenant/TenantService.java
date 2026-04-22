package com.propertymanagement.modules.tenant;

import com.propertymanagement.modules.tenant.dto.TenantRequest;
import com.propertymanagement.modules.tenant.dto.TenantResponse;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UnitRepository unitRepository;

    public Page<TenantResponse> getAll(Pageable pageable, String q) {
        return tenantRepository.searchActive(trimToNull(q), pageable).map(this::toResponse);
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
        if (request.getEmail() != null && tenantRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("Email already registered: " + request.getEmail());
        }

        Tenant tenant = Tenant.builder()
                .fullName(request.getFullName())
                .unitId(request.getUnitId())
                .propertyId(request.getPropertyId())
                .userId(request.getUserId())
                .nationalId(request.getNationalId())
                .phone(request.getPhone())
                .email(request.getEmail())
                .leaseStart(request.getLeaseStart())
                .leaseEnd(request.getLeaseEnd())
                .profileImage(request.getProfileImage())
                .notes(request.getNotes())
                .active(true)
                .build();

        Tenant saved = tenantRepository.save(tenant);
        markUnitRented(request.getUnitId(), true);
        return toResponse(saved);
    }

    @Transactional
    public TenantResponse update(Long id, TenantRequest request) {
        validateScope(request);
        Tenant tenant = findActive(id);

        if (request.getEmail() != null
                && !request.getEmail().equals(tenant.getEmail())
                && tenantRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("Email already registered: " + request.getEmail());
        }

        Long previousUnitId = tenant.getUnitId();

        tenant.setFullName(request.getFullName());
        tenant.setUnitId(request.getUnitId());
        tenant.setPropertyId(request.getPropertyId());
        tenant.setNationalId(request.getNationalId());
        tenant.setPhone(request.getPhone());
        tenant.setEmail(request.getEmail());
        tenant.setLeaseStart(request.getLeaseStart());
        tenant.setLeaseEnd(request.getLeaseEnd());
        tenant.setProfileImage(request.getProfileImage());
        tenant.setNotes(request.getNotes());

        Tenant saved = tenantRepository.save(tenant);

        if (previousUnitId != null && !previousUnitId.equals(request.getUnitId())) {
            markUnitRented(previousUnitId, false);
        }
        markUnitRented(request.getUnitId(), true);

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Tenant tenant = findActive(id);
        tenant.setActive(false);
        tenantRepository.save(tenant);
        markUnitRented(tenant.getUnitId(), false);
    }

    private void validateScope(TenantRequest request) {
        if (request.getUnitId() == null && request.getPropertyId() == null) {
            throw AppException.badRequest("Tenant must be assigned to a unit or a property");
        }
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

    private TenantResponse toResponse(Tenant t) {
        return TenantResponse.builder()
                .id(t.getId())
                .userId(t.getUserId())
                .unitId(t.getUnitId())
                .propertyId(t.getPropertyId())
                .fullName(t.getFullName())
                .nationalId(t.getNationalId())
                .phone(t.getPhone())
                .email(t.getEmail())
                .leaseStart(t.getLeaseStart())
                .leaseEnd(t.getLeaseEnd())
                .profileImage(t.getProfileImage())
                .notes(t.getNotes())
                .active(t.isActive())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
