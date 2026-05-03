package com.propertymanagement.modules.property;

import com.propertymanagement.modules.owner.Owner;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.property.dto.PropertyRequest;
import com.propertymanagement.modules.property.dto.PropertyResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final FloorRepository floorRepository;
    private final UserRepository userRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final CodeGenerationService codeGenerationService;
    private final OwnerRepository ownerRepository;
    private final com.propertymanagement.modules.unit.UnitRepository unitRepository;

    @PersistenceContext
    private EntityManager em;

    public Page<PropertyResponse> getAll(Pageable pageable, String q) {
        return propertyRepository.searchActive(trimToNull(q), pageable).map(this::toResponse);
    }

    public PropertyResponse getById(Long id) {
        Property p = findActive(id);
        return toResponseFull(p);
    }

    @Transactional
    public PropertyResponse create(PropertyRequest request) {
        validateOwnerData(request);
        Long primaryOwnerId = request.getOwnerIds().get(0);
        String normalizedNameAr = firstNonBlank(request.getPropertyNameAr(), request.getPropertyName(), request.getPropertyNameEn());
        String normalizedNameEn = firstNonBlank(request.getPropertyNameEn(), request.getPropertyName(), request.getPropertyNameAr());
        String legacyName = firstNonBlank(request.getPropertyName(), normalizedNameAr, normalizedNameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Property name is required in Arabic and English");
        }

        String propertyCode = codeGenerationService.generate("PROPERTY");
        Property property = Property.builder()
                .propertyName(legacyName)
                .propertyNameAr(normalizedNameAr)
                .propertyNameEn(normalizedNameEn)
                .propertyCode(propertyCode)
                .propertyType(request.getPropertyType())
                .address(request.getAddress())
                .city(request.getCity())
                .country(request.getCountry())
                .googleMapUrl(request.getGoogleMapUrl())
                .totalFloors(request.getTotalFloors())
                .totalUnits(request.getTotalUnits())
                .floorUnitsConfig(request.getFloorUnitsConfig())
                .description(request.getDescription())
                .coverImageUrl(resolvedCoverImage(request))
                .coverImageUrls(normalizeCoverImages(request))
                .ownerId(primaryOwnerId)
                .ownerDocumentFiles(normalizeFiles(request.getOwnerDocumentFiles()))
                .active(true)
                .build();
        Property saved = propertyRepository.save(property);
        syncPropertyOwners(saved.getId(), request.getOwnerIds());
        syncMaintenanceProviders(saved.getId(), request.getMaintenanceProviderType(), request.getMaintenanceProviderIds());
        syncFloors(saved.getId(), saved.getTotalFloors());
        return toResponseFull(propertyRepository.save(saved));
    }

    @Transactional
    public PropertyResponse update(Long id, PropertyRequest request) {
        validateOwnerData(request);
        Long primaryOwnerId = request.getOwnerIds().get(0);
        Property property = findActive(id);
        String normalizedNameAr = firstNonBlank(request.getPropertyNameAr(), request.getPropertyName(), request.getPropertyNameEn());
        String normalizedNameEn = firstNonBlank(request.getPropertyNameEn(), request.getPropertyName(), request.getPropertyNameAr());
        String legacyName = firstNonBlank(request.getPropertyName(), normalizedNameAr, normalizedNameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Property name is required in Arabic and English");
        }

        property.setPropertyName(legacyName);
        property.setPropertyNameAr(normalizedNameAr);
        property.setPropertyNameEn(normalizedNameEn);
        property.setPropertyType(request.getPropertyType());
        property.setAddress(request.getAddress());
        property.setCity(request.getCity());
        property.setCountry(request.getCountry());
        property.setGoogleMapUrl(request.getGoogleMapUrl());
        property.setTotalFloors(request.getTotalFloors());
        property.setTotalUnits(request.getTotalUnits());
        property.setFloorUnitsConfig(request.getFloorUnitsConfig());
        property.setDescription(request.getDescription());
        property.setCoverImageUrl(resolvedCoverImage(request));
        property.setCoverImageUrls(normalizeCoverImages(request));
        property.setOwnerId(primaryOwnerId);
        property.setOwnerDocumentFiles(normalizeFiles(request.getOwnerDocumentFiles()));
        syncPropertyOwners(id, request.getOwnerIds());
        syncMaintenanceProviders(id, request.getMaintenanceProviderType(), request.getMaintenanceProviderIds());
        Property saved = propertyRepository.save(property);
        syncFloors(saved.getId(), saved.getTotalFloors());
        return toResponseFull(saved);
    }

    @Transactional
    public PropertyResponse toggleActive(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Property not found: " + id));
        property.setActive(!property.isActive());
        return toResponse(propertyRepository.save(property));
    }

    @Transactional
    public void delete(Long id) {
        Property property = findActive(id);
        long unitCount = unitRepository.countByPropertyIdAndActiveTrue(id);
        if (unitCount > 0) {
            throw new AppException("Cannot delete property with " + unitCount + " active unit(s). Remove all units first.", org.springframework.http.HttpStatus.CONFLICT, "PROPERTY_HAS_UNITS");
        }
        property.setActive(false);
        propertyRepository.save(property);
    }

    private Property findActive(Long id) {
        return propertyRepository.findById(id)
                .filter(Property::isActive)
                .orElseThrow(() -> AppException.notFound("Property not found: " + id));
    }

    private PropertyResponse toResponse(Property p) {
        return buildResponse(p, null, null);
    }

    private PropertyResponse toResponseFull(Property p) {
        List<Long> ownerIds = fetchPropertyOwnerIds(p.getId());
        List<Owner> owners = ownerIds.isEmpty() ? List.of() : ownerRepository.findAllById(ownerIds);
        List<PropertyResponse.MaintenanceProviderSummary> providers = fetchMaintenanceProviders(p.getId());
        return buildResponse(p, owners, providers);
    }

    private PropertyResponse buildResponse(Property p, List<Owner> owners,
                                           List<PropertyResponse.MaintenanceProviderSummary> maintenanceProviders) {
        String localizedName = LocalizedNameResolver.resolve(p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName());
        List<PropertyResponse.OwnerSummary> ownerSummaries = owners == null ? null : owners.stream()
                .map(o -> PropertyResponse.OwnerSummary.builder()
                        .id(o.getId())
                        .fullName(o.getFullName())
                        .fullNameAr(o.getFullNameAr())
                        .fullNameEn(o.getFullNameEn())
                        .nationalId(o.getNationalId())
                        .phone(o.getPhone())
                        .email(o.getEmail())
                        .build())
                .collect(Collectors.toList());
        return PropertyResponse.builder()
                .id(p.getId())
                .ownerId(p.getOwnerId())
                .owners(ownerSummaries)
                .maintenanceProviders(maintenanceProviders)
                .propertyName(localizedName)
                .propertyNameAr(firstNonBlank(p.getPropertyNameAr(), p.getPropertyName(), p.getPropertyNameEn()))
                .propertyNameEn(firstNonBlank(p.getPropertyNameEn(), p.getPropertyName(), p.getPropertyNameAr()))
                .propertyCode(p.getPropertyCode())
                .propertyType(p.getPropertyType())
                .address(p.getAddress())
                .city(p.getCity())
                .country(p.getCountry())
                .googleMapUrl(p.getGoogleMapUrl())
                .totalFloors(p.getTotalFloors())
                .totalUnits(p.getTotalUnits())
                .floorUnitsConfig(p.getFloorUnitsConfig())
                .description(p.getDescription())
                .coverImageUrl(p.getCoverImageUrl())
                .coverImageUrls(p.getCoverImageUrls())
                .ownerDocumentFiles(p.getOwnerDocumentFiles())
                .active(p.isActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .createdBy(p.getCreatedBy())
                .createdByName(resolveUserName(p.getCreatedBy()))
                .modifiedBy(p.getModifiedBy())
                .modifiedByName(resolveUserName(p.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    @SuppressWarnings("unchecked")
    private List<Long> fetchPropertyOwnerIds(Long propertyId) {
        return em.createNativeQuery(
                "SELECT owner_id FROM property_mgmt.property_owners WHERE property_id = :pid")
                .setParameter("pid", propertyId)
                .getResultList();
    }

    private void syncFloors(Long propertyId, int totalFloors) {
        List<Floor> existing = floorRepository.findByPropertyIdOrderByFloorNumberAsc(propertyId);
        // Add missing floors
        for (int n = 1; n <= totalFloors; n++) {
            final int floorNum = n;
            boolean exists = existing.stream().anyMatch(f -> f.getFloorNumber() == floorNum);
            if (!exists) {
                floorRepository.save(Floor.builder()
                        .propertyId(propertyId)
                        .floorNumber(floorNum)
                        .floorLabel("الطابق " + floorNum)
                        .build());
            }
        }
        // Remove floors beyond new totalFloors (only if they have no units)
        existing.stream()
                .filter(f -> f.getFloorNumber() > totalFloors)
                .forEach(f -> floorRepository.delete(f));
    }

    private void syncPropertyOwners(Long propertyId, List<Long> ownerIds) {
        em.createNativeQuery(
                "DELETE FROM property_mgmt.property_owners WHERE property_id = :pid")
                .setParameter("pid", propertyId)
                .executeUpdate();
        for (Long ownerId : ownerIds.stream().distinct().collect(Collectors.toList())) {
            em.createNativeQuery(
                    "INSERT INTO property_mgmt.property_owners (property_id, owner_id) VALUES (:pid, :oid)")
                    .setParameter("pid", propertyId)
                    .setParameter("oid", ownerId)
                    .executeUpdate();
        }
    }

    private void validateOwnerData(PropertyRequest request) {
        if (request.getOwnerIds() == null || request.getOwnerIds().isEmpty()) {
            throw AppException.badRequest("At least one owner is required");
        }
        List<String> files = normalizeFiles(request.getOwnerDocumentFiles());
        if (files.isEmpty()) {
            throw AppException.badRequest("At least one owner ownership/license attachment is required");
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

    private List<String> normalizeCoverImages(PropertyRequest request) {
        List<String> urls = request.getCoverImageUrls();
        if (urls != null && !urls.isEmpty()) {
            return normalizeFiles(urls);
        }
        String single = request.getCoverImageUrl();
        if (single != null && !single.isBlank()) {
            return List.of(single.trim());
        }
        return List.of();
    }

    private String resolvedCoverImage(PropertyRequest request) {
        List<String> imgs = normalizeCoverImages(request);
        return imgs.isEmpty() ? null : imgs.get(0);
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (LocalizedNameResolver.notBlank(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private void syncMaintenanceProviders(Long propertyId, String providerType, List<Long> providerIds) {
        em.createNativeQuery(
                "DELETE FROM property_mgmt.property_maintenance_providers WHERE property_id = :pid")
                .setParameter("pid", propertyId)
                .executeUpdate();
        if (providerType == null || providerIds == null || providerIds.isEmpty()) return;
        if (!"USER".equals(providerType) && !"COMPANY".equals(providerType)) {
            throw AppException.badRequest("Invalid maintenance provider type: " + providerType);
        }
        for (Long pid : providerIds.stream().distinct().collect(Collectors.toList())) {
            if ("USER".equals(providerType)) {
                User user = userRepository.findById(pid)
                        .orElseThrow(() -> AppException.badRequest("User not found: " + pid));
                if (user.getRole() != UserRole.MAINTENANCE_OFFICER || !user.isActive()) {
                    throw AppException.badRequest("Provider must be an active maintenance officer: " + pid);
                }
            } else {
                if (!contractorCompanyRepository.existsById(pid)) {
                    throw AppException.badRequest("Contractor company not found: " + pid);
                }
            }
            em.createNativeQuery(
                    "INSERT INTO property_mgmt.property_maintenance_providers (property_id, provider_type, provider_id) " +
                    "VALUES (:pid, :type, :provid)")
                    .setParameter("pid", propertyId)
                    .setParameter("type", providerType)
                    .setParameter("provid", pid)
                    .executeUpdate();
        }
    }

    @SuppressWarnings("unchecked")
    private List<PropertyResponse.MaintenanceProviderSummary> fetchMaintenanceProviders(Long propertyId) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT pmp.provider_type, pmp.provider_id, " +
                "       u.full_name AS user_name, cc.name AS company_name, cc.name_ar, cc.name_en " +
                "FROM property_mgmt.property_maintenance_providers pmp " +
                "LEFT JOIN property_mgmt.users u ON pmp.provider_type = 'USER' AND u.id = pmp.provider_id " +
                "LEFT JOIN property_mgmt.contractor_companies cc ON pmp.provider_type = 'COMPANY' AND cc.id = pmp.provider_id " +
                "WHERE pmp.property_id = :pid")
                .setParameter("pid", propertyId)
                .getResultList();

        return rows.stream().map(row -> {
            String type = (String) row[0];
            Long id = ((Number) row[1]).longValue();
            String name;
            if ("USER".equals(type)) {
                name = row[2] != null ? (String) row[2] : String.valueOf(id);
            } else {
                String nameAr = row[4] != null ? (String) row[4] : null;
                String nameEn = row[5] != null ? (String) row[5] : null;
                String base = row[3] != null ? (String) row[3] : null;
                name = firstNonBlank(nameAr, nameEn, base, String.valueOf(id));
            }
            return PropertyResponse.MaintenanceProviderSummary.builder()
                    .id(id)
                    .providerType(type)
                    .name(name)
                    .build();
        }).collect(Collectors.toList());
    }
}
