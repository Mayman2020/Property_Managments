package com.propertymanagement.modules.inventory.repository;

import com.propertymanagement.modules.inventory.entity.InventoryItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryItemEntity, Long> {
    Page<InventoryItemEntity> findByActiveTrue(Pageable pageable);
    Page<InventoryItemEntity> findByPropertyIdAndActiveTrue(Long propertyId, Pageable pageable);
    @Query("""
            SELECT i FROM InventoryItemEntity i
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
    Page<InventoryItemEntity> searchActive(@Param("q") String q, Pageable pageable);

    @Query("""
            SELECT i FROM InventoryItemEntity i
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
    Page<InventoryItemEntity> searchByPropertyActive(@Param("propertyId") Long propertyId, @Param("q") String q, Pageable pageable);

    @Query("""
            SELECT i FROM InventoryItemEntity i
            WHERE i.active = true
              AND i.propertyId IN :propertyIds
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(i.itemCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.itemNameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.itemNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.unitOfMeasure, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(i.location, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<InventoryItemEntity> searchActiveInPropertyIds(@Param("propertyIds") Collection<Long> propertyIds, @Param("q") String q, Pageable pageable);

    @Query("SELECT i FROM InventoryItemEntity i WHERE i.active = true AND i.quantity <= i.minQuantity")
    List<InventoryItemEntity> findLowStock();

    @Query("SELECT i FROM InventoryItemEntity i WHERE i.active = true AND i.propertyId IN :propertyIds AND i.quantity <= i.minQuantity")
    List<InventoryItemEntity> findLowStockInPropertyIds(@Param("propertyIds") Collection<Long> propertyIds);

    @Query("SELECT i FROM InventoryItemEntity i WHERE i.propertyId = :pid AND i.active = true AND i.quantity <= i.minQuantity")
    List<InventoryItemEntity> findLowStockByProperty(Long pid);

    @Query("SELECT COUNT(i) FROM InventoryItemEntity i WHERE i.active = true AND i.quantity <= i.minQuantity")
    long countLowStock();

    @Query("SELECT COUNT(i) FROM InventoryItemEntity i WHERE i.propertyId = :pid AND i.active = true AND i.quantity <= i.minQuantity")
    long countLowStockByProperty(@Param("pid") Long propertyId);

    long countByActiveTrue();

    long countByPropertyIdAndActiveTrue(Long propertyId);
}
