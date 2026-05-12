package com.propertymanagement.modules.property.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import com.propertymanagement.modules.property.entity.Floor;

@Repository
public interface FloorRepository extends JpaRepository<Floor, Long> {
    List<Floor> findByPropertyIdOrderByFloorNumberAsc(Long propertyId);
    boolean existsByPropertyIdAndFloorNumber(Long propertyId, Integer floorNumber);
}
