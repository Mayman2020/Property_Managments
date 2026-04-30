package com.propertymanagement.modules.property;

import com.propertymanagement.modules.property.dto.PropertyRequest;
import com.propertymanagement.modules.property.dto.PropertyResponse;
import com.propertymanagement.modules.user.MaintenanceOfficerType;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;

    public Page<PropertyResponse> getAll(Pageable pageable, String q) {
        return propertyRepository.searchActive(trimToNull(q), pageable).map(this::toResponse);
    }

    public PropertyResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public PropertyResponse create(PropertyRequest request) {
        validateOwnerData(request);
        String normalizedNameAr = firstNonBlank(request.getPropertyNameAr(), request.getPropertyName(), request.getPropertyNameEn());
        String normalizedNameEn = firstNonBlank(request.getPropertyNameEn(), request.getPropertyName(), request.getPropertyNameAr());
        String legacyName = firstNonBlank(request.getPropertyName(), normalizedNameAr, normalizedNameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Property name is required in Arabic and English");
        }

        String propertyCode = resolvePropertyCode(request.getPropertyCode());
        if (propertyRepository.existsByPropertyCode(propertyCode)) {
            throw AppException.conflict("Property code already exists: " + propertyCode);
        }
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
                .description(request.getDescription())
                .coverImageUrl(request.getCoverImageUrl())
                .ownerId(request.getOwnerId())
                .ownerNameAr(request.getOwnerNameAr())
                .ownerNameEn(request.getOwnerNameEn())
                .ownerEmail(request.getOwnerEmail())
                .ownerCivilId(request.getOwnerCivilId())
                .ownerDocumentFiles(normalizeFiles(request.getOwnerDocumentFiles()))
                .active(true)
                .build();
        Property saved = propertyRepository.save(property);
        applyMaintenanceRouting(saved, request.getMaintenanceInternalOfficerUserId(), request.getMaintenanceContractorCompanyId());
        return toResponse(propertyRepository.save(saved));
    }

    @Transactional
    public PropertyResponse update(Long id, PropertyRequest request) {
        validateOwnerData(request);
        Property property = findActive(id);
        String normalizedNameAr = firstNonBlank(request.getPropertyNameAr(), request.getPropertyName(), request.getPropertyNameEn());
        String normalizedNameEn = firstNonBlank(request.getPropertyNameEn(), request.getPropertyName(), request.getPropertyNameAr());
        String legacyName = firstNonBlank(request.getPropertyName(), normalizedNameAr, normalizedNameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Property name is required in Arabic and English");
        }

        String incomingCode = trimToNull(request.getPropertyCode());
        String effectiveCode = incomingCode != null ? incomingCode : property.getPropertyCode();
        if (!property.getPropertyCode().equals(effectiveCode)
                && propertyRepository.existsByPropertyCode(effectiveCode)) {
            throw AppException.conflict("Property code already exists: " + effectiveCode);
        }
        property.setPropertyName(legacyName);
        property.setPropertyNameAr(normalizedNameAr);
        property.setPropertyNameEn(normalizedNameEn);
        property.setPropertyCode(effectiveCode);
        property.setPropertyType(request.getPropertyType());
        property.setAddress(request.getAddress());
        property.setCity(request.getCity());
        property.setCountry(request.getCountry());
        property.setGoogleMapUrl(request.getGoogleMapUrl());
        property.setTotalFloors(request.getTotalFloors());
        property.setTotalUnits(request.getTotalUnits());
        property.setDescription(request.getDescription());
        property.setCoverImageUrl(request.getCoverImageUrl());
        property.setOwnerId(request.getOwnerId());
        property.setOwnerNameAr(request.getOwnerNameAr());
        property.setOwnerNameEn(request.getOwnerNameEn());
        property.setOwnerEmail(request.getOwnerEmail());
        property.setOwnerCivilId(request.getOwnerCivilId());
        property.setOwnerDocumentFiles(normalizeFiles(request.getOwnerDocumentFiles()));
        applyMaintenanceRouting(property, request.getMaintenanceInternalOfficerUserId(), request.getMaintenanceContractorCompanyId());
        return toResponse(propertyRepository.save(property));
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
        property.setActive(false);
        propertyRepository.save(property);
    }

    private Property findActive(Long id) {
        return propertyRepository.findById(id)
                .filter(Property::isActive)
                .orElseThrow(() -> AppException.notFound("Property not found: " + id));
    }

    private PropertyResponse toResponse(Property p) {
        String localizedName = LocalizedNameResolver.resolve(p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName());
        return PropertyResponse.builder()
                .id(p.getId())
                .ownerId(p.getOwnerId())
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
                .description(p.getDescription())
                .coverImageUrl(p.getCoverImageUrl())
                .ownerNameAr(p.getOwnerNameAr())
                .ownerNameEn(p.getOwnerNameEn())
                .ownerEmail(p.getOwnerEmail())
                .ownerCivilId(p.getOwnerCivilId())
                .ownerDocumentFiles(p.getOwnerDocumentFiles())
                .maintenanceInternalOfficerUserId(p.getMaintenanceInternalOfficerUserId())
                .maintenanceContractorCompanyId(p.getMaintenanceContractorCompanyId())
                .active(p.isActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private void validateOwnerData(PropertyRequest request) {
        if (request.getOwnerId() == null) {
            throw AppException.badRequest("Owner is required");
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

    private String resolvePropertyCode(String requested) {
        String trimmed = trimToNull(requested);
        if (trimmed != null) {
            return trimmed;
        }
        long seq = propertyRepository.count() + 1;
        String candidate;
        do {
            candidate = "PROP-" + String.format("%05d", seq++);
        } while (propertyRepository.existsByPropertyCode(candidate));
        return candidate;
    }

    private void applyMaintenanceRouting(Property property, Long internalOfficerUserId, Long contractorCompanyId) {
        if (internalOfficerUserId != null && contractorCompanyId != null) {
            throw AppException.badRequest("Choose either an internal maintenance officer or a contractor company, not both");
        }
        property.setMaintenanceInternalOfficerUserId(null);
        property.setMaintenanceContractorCompanyId(null);
        if (internalOfficerUserId != null) {
            assertInternalOfficerForProperty(property.getId(), internalOfficerUserId);
            property.setMaintenanceInternalOfficerUserId(internalOfficerUserId);
        } else if (contractorCompanyId != null) {
            if (!contractorCompanyRepository.existsById(contractorCompanyId)) {
                throw AppException.badRequest("Contractor company not found: " + contractorCompanyId);
            }
            property.setMaintenanceContractorCompanyId(contractorCompanyId);
        }
    }

    private void assertInternalOfficerForProperty(Long propertyId, Long officerUserId) {
        if (propertyId == null) {
            throw AppException.badRequest("Property must be saved before linking an internal officer");
        }
        User officer = userRepository.findById(officerUserId)
                .orElseThrow(() -> AppException.badRequest("User not found: " + officerUserId));
        if (officer.getRole() != UserRole.MAINTENANCE_OFFICER || !officer.isActive()) {
            throw AppException.badRequest("Internal maintenance officer must be an active maintenance officer account");
        }
        if (officer.getMaintenanceOfficerType() != MaintenanceOfficerType.INTERNAL_PROPERTY) {
            throw AppException.badRequest("Internal maintenance officer must have type INTERNAL_PROPERTY");
        }
        if (officer.getPropertyId() == null || !officer.getPropertyId().equals(propertyId)) {
            throw AppException.badRequest("Officer must be assigned to this same property");
        }
    }
}
