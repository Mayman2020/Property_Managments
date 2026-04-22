package com.propertymanagement.modules.property;

import com.propertymanagement.modules.property.dto.FloorRequest;
import com.propertymanagement.modules.property.dto.FloorResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FloorService {

    private final FloorRepository floorRepository;

    public List<FloorResponse> getByProperty(Long propertyId) {
        return floorRepository.findByPropertyIdOrderByFloorNumberAsc(propertyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
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
