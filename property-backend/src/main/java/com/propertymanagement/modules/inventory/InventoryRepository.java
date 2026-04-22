package com.propertymanagement.modules.inventory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {
    Page<InventoryItem> findByActiveTrue(Pageable pageable);
    Page<InventoryItem> findByPropertyIdAndActiveTrue(Long propertyId, Pageable pageable);

    @Query("SELECT i FROM InventoryItem i WHERE i.active = true AND i.quantity <= i.minQuantity")
    List<InventoryItem> findLowStock();

    @Query("SELECT i FROM InventoryItem i WHERE i.propertyId = :pid AND i.active = true AND i.quantity <= i.minQuantity")
    List<InventoryItem> findLowStockByProperty(Long pid);

    @Query("SELECT COUNT(i) FROM InventoryItem i WHERE i.active = true AND i.quantity <= i.minQuantity")
    long countLowStock();
}
