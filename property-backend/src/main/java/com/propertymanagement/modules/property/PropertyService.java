package com.propertymanagement.modules.property;

import com.propertymanagement.modules.property.dto.PropertyRequest;
import com.propertymanagement.modules.property.dto.PropertyResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public Page<PropertyResponse> getAll(Pageable pageable) {
        return propertyRepository.findByActiveTrue(pageable).map(this::toResponse);
    }

    public PropertyResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public PropertyResponse create(PropertyRequest request) {
        if (propertyRepository.existsByPropertyCode(request.getPropertyCode())) {
            throw AppException.conflict("Property code already exists: " + request.getPropertyCode());
        }
        Property property = Property.builder()
                .propertyName(request.getPropertyName())
                .propertyCode(request.getPropertyCode())
                .propertyType(request.getPropertyType())
                .address(request.getAddress())
                .city(request.getCity())
                .country(request.getCountry())
                .totalFloors(request.getTotalFloors())
                .totalUnits(request.getTotalUnits())
                .description(request.getDescription())
                .coverImageUrl(request.getCoverImageUrl())
                .ownerId(request.getOwnerId())
                .active(true)
                .build();
        return toResponse(propertyRepository.save(property));
    }

    @Transactional
    public PropertyResponse update(Long id, PropertyRequest request) {
        Property property = findActive(id);
        if (!property.getPropertyCode().equals(request.getPropertyCode())
                && propertyRepository.existsByPropertyCode(request.getPropertyCode())) {
            throw AppException.conflict("Property code already exists: " + request.getPropertyCode());
        }
        property.setPropertyName(request.getPropertyName());
        property.setPropertyCode(request.getPropertyCode());
        property.setPropertyType(request.getPropertyType());
        property.setAddress(request.getAddress());
        property.setCity(request.getCity());
        property.setCountry(request.getCountry());
        property.setTotalFloors(request.getTotalFloors());
        property.setTotalUnits(request.getTotalUnits());
        property.setDescription(request.getDescription());
        property.setCoverImageUrl(request.getCoverImageUrl());
        property.setOwnerId(request.getOwnerId());
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
        return PropertyResponse.builder()
                .id(p.getId())
                .ownerId(p.getOwnerId())
                .propertyName(p.getPropertyName())
                .propertyCode(p.getPropertyCode())
                .propertyType(p.getPropertyType())
                .address(p.getAddress())
                .city(p.getCity())
                .country(p.getCountry())
                .totalFloors(p.getTotalFloors())
                .totalUnits(p.getTotalUnits())
                .description(p.getDescription())
                .coverImageUrl(p.getCoverImageUrl())
                .active(p.isActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
