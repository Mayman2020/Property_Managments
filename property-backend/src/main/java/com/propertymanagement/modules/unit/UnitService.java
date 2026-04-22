package com.propertymanagement.modules.unit;

import com.propertymanagement.modules.unit.dto.UnitRequest;
import com.propertymanagement.modules.unit.dto.UnitResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;

    public Page<UnitResponse> getByProperty(Long propertyId, Pageable pageable) {
        return unitRepository.findByPropertyIdAndActiveTrue(propertyId, pageable).map(this::toResponse);
    }

    public UnitResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public UnitResponse create(UnitRequest request) {
        if (unitRepository.existsByPropertyIdAndUnitNumber(request.getPropertyId(), request.getUnitNumber())) {
            throw AppException.conflict("Unit number already exists in this property: " + request.getUnitNumber());
        }
        Unit unit = Unit.builder()
                .propertyId(request.getPropertyId())
                .floorId(request.getFloorId())
                .unitNumber(request.getUnitNumber())
                .unitType(request.getUnitType())
                .areaSqm(request.getAreaSqm())
                .bedrooms(request.getBedrooms())
                .bathrooms(request.getBathrooms())
                .rentAmount(request.getRentAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "SAR")
                .notes(request.getNotes())
                .active(true)
                .build();
        return toResponse(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findActive(id);
        if (!unit.getUnitNumber().equals(request.getUnitNumber())
                && unitRepository.existsByPropertyIdAndUnitNumber(unit.getPropertyId(), request.getUnitNumber())) {
            throw AppException.conflict("Unit number already exists in this property: " + request.getUnitNumber());
        }
        unit.setUnitNumber(request.getUnitNumber());
        unit.setUnitType(request.getUnitType());
        unit.setFloorId(request.getFloorId());
        unit.setAreaSqm(request.getAreaSqm());
        unit.setBedrooms(request.getBedrooms());
        unit.setBathrooms(request.getBathrooms());
        unit.setRentAmount(request.getRentAmount());
        unit.setCurrency(request.getCurrency() != null ? request.getCurrency() : "SAR");
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
                .build();
    }
}
