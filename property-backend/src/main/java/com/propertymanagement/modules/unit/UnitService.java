package com.propertymanagement.modules.unit;

import com.propertymanagement.modules.unit.dto.UnitRequest;
import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.unit.dto.UnitResponse;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final CodeGenerationService codeGenerationService;

    public Page<UnitResponse> getByProperty(Long propertyId, Pageable pageable, String q) {
        return unitRepository.searchByProperty(propertyId, trimToNull(q), pageable).map(this::toResponse);
    }

    public UnitResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public UnitResponse create(UnitRequest request) {
        validateFloorCapacity(request.getPropertyId(), request.getFloorId(), null);
        String generatedUnitNumber = codeGenerationService.generate("UNIT");
        Unit unit = Unit.builder()
                .propertyId(request.getPropertyId())
                .floorId(request.getFloorId())
                .unitNumber(generatedUnitNumber)
                .unitType(request.getUnitType())
                .furnishedStatus(request.getFurnishedStatus())
                .areaSqm(request.getAreaSqm())
                .bedrooms(request.getBedrooms())
                .bathrooms(request.getBathrooms())
                .rentAmount(request.getRentAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "OMR")
                .notes(request.getNotes())
                .active(true)
                .build();
        return toResponse(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findActive(id);
        validateFloorCapacity(request.getPropertyId(), request.getFloorId(), id);
        // unitNumber is generated on create and must not be changed on update
        unit.setUnitType(request.getUnitType());
        unit.setFurnishedStatus(request.getFurnishedStatus());
        unit.setFloorId(request.getFloorId());
        unit.setAreaSqm(request.getAreaSqm());
        unit.setBedrooms(request.getBedrooms());
        unit.setBathrooms(request.getBathrooms());
        unit.setRentAmount(request.getRentAmount());
        unit.setCurrency(request.getCurrency() != null ? request.getCurrency() : "OMR");
        unit.setNotes(request.getNotes());
        return toResponse(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse setRentalStatus(Long id, boolean rented) {
        Unit unit = findActive(id);
        unit.setRented(rented);
        return toResponse(unitRepository.save(unit));
    }

    @Transactional
    public void delete(Long id) {
        Unit unit = findActive(id);
        if (unit.isRented()) {
            throw new AppException("Cannot delete a rented unit. Mark it as vacant first.", org.springframework.http.HttpStatus.CONFLICT, "UNIT_IS_RENTED");
        }
        unit.setActive(false);
        unitRepository.save(unit);
    }

    private Unit findActive(Long id) {
        return unitRepository.findById(id)
                .filter(Unit::isActive)
                .orElseThrow(() -> AppException.notFound("Unit not found: " + id));
    }

    private UnitResponse toResponse(Unit u) {
        return UnitResponse.builder()
                .id(u.getId())
                .propertyId(u.getPropertyId())
                .floorId(u.getFloorId())
                .unitNumber(u.getUnitNumber())
                .unitType(u.getUnitType())
                .furnishedStatus(u.getFurnishedStatus())
                .areaSqm(u.getAreaSqm())
                .bedrooms(u.getBedrooms())
                .bathrooms(u.getBathrooms())
                .rented(u.isRented())
                .rentAmount(u.getRentAmount())
                .currency(u.getCurrency())
                .notes(u.getNotes())
                .active(u.isActive())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .createdBy(u.getCreatedBy())
                .createdByName(resolveUserName(u.getCreatedBy()))
                .modifiedBy(u.getModifiedBy())
                .modifiedByName(resolveUserName(u.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private void validateFloorCapacity(Long propertyId, Long floorId, Long currentUnitId) {
        if (propertyId == null || floorId == null) return;
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> AppException.notFound("Property not found"));
        
        Map<Integer, Integer> config = property.getFloorUnitsConfig();
        Integer floorKey = floorId.intValue();
        if (config == null || !config.containsKey(floorKey)) return;
        
        int capacity = config.get(floorKey);
        long currentCount = unitRepository.countByPropertyIdAndFloorIdAndActiveTrue(propertyId, floorId);
        
        // If updating, don't count the current unit if it was already on this floor
        if (currentUnitId != null) {
            Unit currentUnit = unitRepository.findById(currentUnitId).orElse(null);
            if (currentUnit != null && currentUnit.getPropertyId().equals(propertyId) && floorId.equals(currentUnit.getFloorId())) {
                currentCount--;
            }
        }

        if (currentCount >= capacity) {
            throw new AppException("Floor " + floorId + " capacity reached (" + capacity + " units max)", org.springframework.http.HttpStatus.BAD_REQUEST, "FLOOR_CAPACITY_REACHED");
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
