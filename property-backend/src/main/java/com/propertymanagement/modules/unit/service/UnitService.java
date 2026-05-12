package com.propertymanagement.modules.unit.service;

import com.propertymanagement.modules.unit.dto.UnitRequest;
import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.unit.dto.UnitResponse;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.property.entity.Floor;
import com.propertymanagement.modules.property.repository.FloorRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.BilingualNotificationText;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.entity.UnitType;
import com.propertymanagement.modules.unit.repository.UnitRepository;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final FloorRepository floorRepository;
    private final PropertyScopeService propertyScopeService;
    private final UserRepository userRepository;
    private final CodeGenerationService codeGenerationService;
    private final LeaseContractService leaseContractService;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;

    public Page<UnitResponse> getByProperty(Long propertyId, Pageable pageable, String q) {
        assertCanAccessProperty(propertyId);
        Page<Unit> page = unitRepository.searchByProperty(propertyId, trimToNull(q), pageable);
        Map<Long, Integer> floorNumbers = loadFloorNumbersForUnits(page.getContent());
        return page.map(u -> toResponse(u, floorNumbers));
    }

    public UnitResponse getById(Long id) {
        Unit unit = findActive(id);
        assertCanAccessProperty(unit.getPropertyId());
        return toResponse(unit, loadFloorNumbersForUnits(List.of(unit)));
    }

    /** For embedded screens (e.g. contract renewal); includes inactive units. */
    public Optional<UnitResponse> findByIdForContext(Long unitId) {
        if (unitId == null) {
            return Optional.empty();
        }
        return unitRepository.findById(unitId)
                .map(u -> toResponse(u, loadFloorNumbersForUnits(List.of(u))));
    }

    @Transactional
    public UnitResponse create(UnitRequest request) {
        assertCanAccessProperty(request.getPropertyId());
        validatePropertyTotalUnitCapacity(request.getPropertyId());
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
        Unit saved = unitRepository.save(unit);
        notifyOwnersOfNewUnit(saved);
        return toResponse(saved, loadFloorNumbersForUnits(List.of(saved)));
    }

    private void notifyOwnersOfNewUnit(Unit unit) {
        if (unit == null || unit.getPropertyId() == null) {
            return;
        }
        List<Long> recipients = propertyOwnerPortalRecipientService.portalRecipientUserIds(unit.getPropertyId());
        if (recipients.isEmpty()) {
            return;
        }
        try {
            Property property = propertyRepository.findById(unit.getPropertyId()).filter(Property::isActive).orElse(null);
            if (property == null) {
                return;
            }
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put(
                    "propertyName",
                    BilingualNotificationText.composite(
                            property.getPropertyNameAr(),
                            property.getPropertyNameEn(),
                            property.getPropertyName()));
            vars.put("unitNumber", unit.getUnitNumber() != null ? unit.getUnitNumber() : "");
            Map<String, Object> hints = new LinkedHashMap<>();
            hints.put("unitId", unit.getId());
            hints.put("propertyId", unit.getPropertyId());
            notificationService.createLocalized(
                    recipients,
                    currentActorUserId(),
                    unit.getPropertyId(),
                    null,
                    NotificationType.UNIT_ADDED_TO_OWNER_PROPERTY,
                    "NOTIFICATIONS.UNIT_ADDED_TITLE",
                    "NOTIFICATIONS.UNIT_ADDED_OWNER_BODY",
                    vars,
                    hints);
        } catch (Exception ignored) {
            // Side-effect: unit save must succeed even if notification persistence fails.
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
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findActive(id);
        assertCanAccessProperty(unit.getPropertyId());
        assertCanAccessProperty(request.getPropertyId());
        validateFloorCapacity(unit.getPropertyId(), request.getFloorId(), id);
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
        Unit saved = unitRepository.save(unit);
        return toResponse(saved, loadFloorNumbersForUnits(List.of(saved)));
    }

    /**
     * Recomputes {@code is_rented} (ACTIVE/SUSPENDED) and {@code is_reserved} (DRAFT/PENDING without live lease)
     * from lease contracts. The request body flag is ignored; callers use this as a manual resync.
     */
    @Transactional
    public UnitResponse setRentalStatus(Long id, boolean rented) {
        Unit unit = findActive(id);
        assertCanAccessProperty(unit.getPropertyId());
        leaseContractService.syncUnitRentedFromContracts(id);
        return getById(id);
    }

    @Transactional
    public UnitResponse toggleActive(Long id) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Unit not found: " + id));
        assertCanAccessProperty(unit.getPropertyId());
        if (unit.isActive() && (unit.isRented() || unit.isReserved())) {
            throw new AppException("Cannot deactivate a unit with an active or pending lease.", org.springframework.http.HttpStatus.CONFLICT, "UNIT_IS_RENTED");
        }
        unit.setActive(!unit.isActive());
        Unit saved = unitRepository.save(unit);
        return toResponse(saved, loadFloorNumbersForUnits(List.of(saved)));
    }

    @Transactional
    public void delete(Long id) {
        Unit unit = findActive(id);
        assertCanAccessProperty(unit.getPropertyId());
        if (unit.isRented() || unit.isReserved()) {
            throw new AppException("Cannot delete a unit with an active or pending lease. Cancel the lease or wait until the unit is vacant.", org.springframework.http.HttpStatus.CONFLICT, "UNIT_IS_RENTED");
        }
        unit.setActive(false);
        unitRepository.save(unit);
    }

    private Unit findActive(Long id) {
        return unitRepository.findById(id)
                .filter(Unit::isActive)
                .orElseThrow(() -> AppException.notFound("Unit not found: " + id));
    }

    private void assertCanAccessProperty(Long propertyId) {
        if (!propertyScopeService.canAccessProperty(propertyId)) {
            throw AppException.forbidden("You do not have access to this property");
        }
    }

    private Map<Long, Integer> loadFloorNumbersForUnits(List<Unit> units) {
        if (units == null || units.isEmpty()) {
            return Map.of();
        }
        Set<Long> ids = units.stream()
                .map(Unit::getFloorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        if (ids.isEmpty()) {
            return Map.of();
        }
        return floorRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Floor::getId, Floor::getFloorNumber));
    }

    private UnitResponse toResponse(Unit u, Map<Long, Integer> floorNumberByFloorId) {
        Integer floorNumber = u.getFloorId() == null ? null : floorNumberByFloorId.get(u.getFloorId());
        return UnitResponse.builder()
                .id(u.getId())
                .propertyId(u.getPropertyId())
                .floorId(u.getFloorId())
                .floorNumber(floorNumber)
                .unitNumber(u.getUnitNumber())
                .unitType(u.getUnitType())
                .furnishedStatus(u.getFurnishedStatus())
                .areaSqm(u.getAreaSqm())
                .bedrooms(u.getBedrooms())
                .bathrooms(u.getBathrooms())
                .rented(u.isRented())
                .reserved(u.isReserved())
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

    private void validatePropertyTotalUnitCapacity(Long propertyId) {
        if (propertyId == null) {
            return;
        }
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> AppException.notFound("Property not found"));
        Map<Integer, Integer> config = property.getFloorUnitsConfig();
        if (config == null || config.isEmpty()) {
            return;
        }
        int maxTotal = config.values().stream().mapToInt(Integer::intValue).sum();
        if (maxTotal <= 0) {
            return;
        }
        long current = unitRepository.countByPropertyIdAndActiveTrue(propertyId);
        if (current >= maxTotal) {
            throw AppException.badRequest(
                    "This property has reached its maximum configured unit count (" + maxTotal + ").",
                    "PROPERTY_UNIT_CAPACITY_REACHED");
        }
    }

    private void validateFloorCapacity(Long propertyId, Long floorId, Long currentUnitId) {
        if (propertyId == null || floorId == null) return;
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> AppException.notFound("Property not found"));

        Map<Integer, Integer> config = property.getFloorUnitsConfig();
        if (config == null || config.isEmpty()) return;

        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> AppException.badRequest("Invalid floor id: " + floorId, "INVALID_FLOOR"));
        if (!floor.getPropertyId().equals(propertyId)) {
            throw AppException.badRequest("Floor does not belong to this property.", "FLOOR_PROPERTY_MISMATCH");
        }

        int floorNumber = floor.getFloorNumber();
        if (!config.containsKey(floorNumber)) return;

        int capacity = config.get(floorNumber);
        long currentCount = unitRepository.countByPropertyIdAndFloorIdAndActiveTrue(propertyId, floorId);

        if (currentUnitId != null) {
            Unit currentUnit = unitRepository.findById(currentUnitId).orElse(null);
            if (currentUnit != null && currentUnit.getPropertyId().equals(propertyId) && floorId.equals(currentUnit.getFloorId())) {
                currentCount--;
            }
        }

        if (currentCount >= capacity) {
            throw AppException.badRequest(
                    "Floor " + floorNumber + " capacity reached (" + capacity + " units max).",
                    "FLOOR_CAPACITY_REACHED");
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
