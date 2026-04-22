package com.propertymanagement.modules.property;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FloorRepository extends JpaRepository<Floor, Long> {
    List<Floor> findByPropertyIdOrderByFloorNumberAsc(Long propertyId);
    boolean existsByPropertyIdAndFloorNumber(Long propertyId, Integer floorNumber);
}
