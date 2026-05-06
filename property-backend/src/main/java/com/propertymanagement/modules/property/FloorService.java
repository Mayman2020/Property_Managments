package com.propertymanagement.modules.property;

import com.propertymanagement.modules.property.dto.FloorRequest;
import com.propertymanagement.modules.property.dto.FloorResponse;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FloorService {

    private final FloorRepository floorRepository;
    private final PropertyRepository propertyRepository;
    private final AppMessages appMessages;

    @Transactional
    public List<FloorResponse> getByProperty(Long propertyId) {
        List<Floor> floors = floorRepository.findByPropertyIdOrderByFloorNumberAsc(propertyId);
        if (floors.isEmpty()) {
            floors = provisionFloors(propertyId);
        }
        return floors.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private List<Floor> provisionFloors(Long propertyId) {
        return propertyRepository.findById(propertyId).map(property -> {
            int total = property.getTotalFloors() != null ? property.getTotalFloors() : 0;
            List<Floor> created = new java.util.ArrayList<>();
            for (int n = 1; n <= total; n++) {
                if (!floorRepository.existsByPropertyIdAndFloorNumber(propertyId, n)) {
                    created.add(floorRepository.save(Floor.builder()
                            .propertyId(propertyId)
                            .floorNumber(n)
                            .floorLabel(appMessages.compositeFloorLabel(n))
                            .build()));
                }
            }
            return created;
        }).orElse(java.util.List.of());
    }

    @Transactional
    public FloorResponse create(Long propertyId, FloorRequest request) {
        if (floorRepository.existsByPropertyIdAndFloorNumber(propertyId, request.getFloorNumber())) {
            throw AppException.conflict("Floor number already exists: " + request.getFloorNumber());
        }
        Floor floor = Floor.builder()
                .propertyId(propertyId)
                .floorNumber(request.getFloorNumber())
                .floorLabel(request.getFloorLabel())
                .build();
        return toResponse(floorRepository.save(floor));
    }

    @Transactional
    public FloorResponse update(Long id, FloorRequest request) {
        Floor floor = floorRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Floor not found: " + id));
        floor.setFloorLabel(request.getFloorLabel());
        return toResponse(floorRepository.save(floor));
    }

    @Transactional
    public void delete(Long id) {
        Floor floor = floorRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Floor not found: " + id));
        floorRepository.delete(floor);
    }

    private FloorResponse toResponse(Floor f) {
        return FloorResponse.builder()
                .id(f.getId())
                .propertyId(f.getPropertyId())
                .floorNumber(f.getFloorNumber())
                .floorLabel(f.getFloorLabel())
                .build();
    }
}
