package com.propertymanagement.modules.inventory.repository;

import com.propertymanagement.modules.inventory.entity.InventoryTransactionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransactionEntity, Long> {
    Page<InventoryTransactionEntity> findByItemId(Long itemId, Pageable pageable);
    List<InventoryTransactionEntity> findByRequestId(Long requestId);
}
