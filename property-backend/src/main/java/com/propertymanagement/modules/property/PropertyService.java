package com.propertymanagement.modules.property;

import com.propertymanagement.modules.property.dto.PropertyRequest;
import com.propertymanagement.modules.property.dto.PropertyResponse;
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

        if (propertyRepository.existsByPropertyCode(request.getPropertyCode())) {
            throw AppException.conflict("Property code already exists: " + request.getPropertyCode());
        }
        Property property = Property.builder()
                .propertyName(legacyName)
                .propertyNameAr(normalizedNameAr)
                .propertyNameEn(normalizedNameEn)
                .propertyCode(request.getPropertyCode())
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
                .ownerDocumentFiles(normalizeFiles(request.getOwnerDocumentFiles()))
                .active(true)
                .build();
        return toResponse(propertyRepository.save(property));
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

        if (!property.getPropertyCode().equals(request.getPropertyCode())
                && propertyRepository.existsByPropertyCode(request.getPropertyCode())) {
            throw AppException.conflict("Property code already exists: " + request.getPropertyCode());
        }
        property.setPropertyName(legacyName);
        property.setPropertyNameAr(normalizedNameAr);
        property.setPropertyNameEn(normalizedNameEn);
        property.setPropertyCode(request.getPropertyCode());
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
        property.setOwnerDocumentFiles(normalizeFiles(request.getOwnerDocumentFiles()));
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
                .ownerDocumentFiles(p.getOwnerDocumentFiles())
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
}
