package com.propertymanagement.modules.inventory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryItem, Long> {
    Page<InventoryItem> findByActiveTrue(Pageable pageable);
    Page<InventoryItem> findByPropertyIdAndActiveTrue(Long propertyId, Pageable pageable);
    @Query("""
            SELECT i FROM InventoryItem i
            WHERE i.active = true
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(i.itemCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.itemNameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.itemNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.unitOfMeasure, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<InventoryItem> searchActive(@Param("q") String q, Pageable pageable);

    @Query("""
            SELECT i FROM InventoryItem i
            WHERE i.propertyId = :propertyId
              AND i.active = true
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(i.itemCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.itemNameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.itemNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.unitOfMeasure, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<InventoryItem> searchByPropertyActive(@Param("propertyId") Long propertyId, @Param("q") String q, Pageable pageable);

    @Query("SELECT i FROM InventoryItem i WHERE i.active = true AND i.quantity <= i.minQuantity")
    List<InventoryItem> findLowStock();

    @Query("SELECT i FROM InventoryItem i WHERE i.propertyId = :pid AND i.active = true AND i.quantity <= i.minQuantity")
    List<InventoryItem> findLowStockByProperty(Long pid);

    @Query("SELECT COUNT(i) FROM InventoryItem i WHERE i.active = true AND i.quantity <= i.minQuantity")
    long countLowStock();
}
