package com.propertymanagement.modules.inventory.service;

import com.propertymanagement.modules.inventory.entity.InventoryItemEntity;
import com.propertymanagement.modules.inventory.entity.InventoryTransactionEntity;
import com.propertymanagement.modules.inventory.repository.InventoryRepository;
import com.propertymanagement.modules.inventory.repository.InventoryTransactionRepository;
import com.propertymanagement.modules.inventory.dto.BulkTransactionRequestDTO;
import com.propertymanagement.modules.inventory.dto.InventoryItemRequestDTO;
import com.propertymanagement.modules.inventory.dto.InventoryItemResponseDTO;
import com.propertymanagement.modules.inventory.dto.InventoryTransactionResponseDTO;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequestDTO;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public Page<InventoryItemResponseDTO> getAll(Pageable pageable, String q) {
        String trimmed = trimToNull(q);
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            return inventoryRepository.searchActiveInPropertyIds(ownerScope, trimmed, pageable).map(this::toResponse);
        }
        return inventoryRepository.searchActive(trimmed, pageable).map(this::toResponse);
    }

    public Page<InventoryItemResponseDTO> getByProperty(Long propertyId, Pageable pageable, String q) {
        ownerPropertyAccessService.assertOwnerCanAccessProperty(propertyId);
        return inventoryRepository.searchByPropertyActive(propertyId, trimToNull(q), pageable).map(this::toResponse);
    }

    public List<InventoryItemResponseDTO> getLowStock() {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return List.of();
            }
            return inventoryRepository.findLowStockInPropertyIds(ownerScope).stream().map(this::toResponse).collect(Collectors.toList());
        }
        return inventoryRepository.findLowStock().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<InventoryItemResponseDTO> getLowStockByProperty(Long propertyId) {
        return inventoryRepository.findLowStockByProperty(propertyId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public InventoryItemResponseDTO getById(Long id) {
        InventoryItemEntity item = findActive(id);
        ownerPropertyAccessService.assertOwnerCanAccessProperty(item.getPropertyId());
        return toResponse(item);
    }

    @Transactional
    public InventoryItemResponseDTO create(InventoryItemRequestDTO request) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot create inventory items");
        InventoryItemEntity item = InventoryItemEntity.builder()
                .propertyId(request.getPropertyId())
                .itemCode(request.getItemCode())
                .itemNameAr(request.getItemNameAr())
                .itemNameEn(request.getItemNameEn())
                .unitOfMeasure(request.getUnitOfMeasure())
                .quantity(request.getQuantity() != null ? request.getQuantity() : BigDecimal.ZERO)
                .minQuantity(request.getMinQuantity() != null ? request.getMinQuantity() : BigDecimal.ZERO)
                .location(request.getLocation())
                .active(true)
                .build();
        return toResponse(inventoryRepository.save(item));
    }

    @Transactional
    public InventoryItemResponseDTO update(Long id, InventoryItemRequestDTO request) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot edit inventory items");
        InventoryItemEntity item = findActive(id);
        item.setItemNameAr(request.getItemNameAr());
        item.setItemNameEn(request.getItemNameEn());
        item.setUnitOfMeasure(request.getUnitOfMeasure());
        item.setMinQuantity(request.getMinQuantity() != null ? request.getMinQuantity() : BigDecimal.ZERO);
        item.setLocation(request.getLocation());
        return toResponse(inventoryRepository.save(item));
    }

    @Transactional
    public InventoryItemResponseDTO adjustStock(Long id, StockTransactionRequestDTO request) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot adjust inventory stock");
        InventoryItemEntity item = findActive(id);
        BigDecimal qty = request.getQuantity();

        if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw AppException.badRequest("Quantity must be greater than zero");
        }

        if ("OUT".equalsIgnoreCase(request.getType())) {
            if (item.getQuantity().compareTo(qty) < 0) {
                throw AppException.badRequest("Insufficient stock. Available: " + item.getQuantity());
            }
            item.setQuantity(item.getQuantity().subtract(qty));
        } else {
            item.setQuantity(item.getQuantity().add(qty));
        }

        InventoryItemEntity saved = inventoryRepository.save(item);

        InventoryTransactionEntity transaction = InventoryTransactionEntity.builder()
                .itemId(id)
                .transactionType(request.getType().toUpperCase())
                .quantity(qty)
                .notes(request.getNotes())
                .requestId(request.getRequestId())
                .performedBy(currentUserId())
                .build();
        transactionRepository.save(transaction);

        return toResponse(saved);
    }

    public Page<InventoryTransactionResponseDTO> getTransactions(Long itemId, Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (itemId == null) {
                return Page.empty(pageable);
            }
            InventoryItemEntity item = findActive(itemId);
            ownerPropertyAccessService.assertOwnerCanAccessProperty(item.getPropertyId());
        }
        Page<InventoryTransactionEntity> page = (itemId != null)
                ? transactionRepository.findByItemId(itemId, pageable)
                : transactionRepository.findAll(pageable);
        return page.map(this::toTransactionResponse);
    }

    @Transactional
    public InventoryItemResponseDTO createTransaction(BulkTransactionRequestDTO request) {
        StockTransactionRequestDTO stock = new StockTransactionRequestDTO();
        stock.setType(request.getTransactionType());
        stock.setQuantity(request.getQuantity());
        stock.setNotes(request.getNotes());
        stock.setRequestId(request.getRequestId());
        return adjustStock(request.getItemId(), stock);
    }

    @Transactional
    public void delete(Long id) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot delete inventory items");
        InventoryItemEntity item = findActive(id);
        item.setActive(false);
        inventoryRepository.save(item);
    }

    private InventoryItemEntity findActive(Long id) {
        return inventoryRepository.findById(id)
                .filter(InventoryItemEntity::isActive)
                .orElseThrow(() -> AppException.notFound("Inventory item not found: " + id));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private InventoryTransactionResponseDTO toTransactionResponse(InventoryTransactionEntity t) {
        return InventoryTransactionResponseDTO.builder()
                .id(t.getId())
                .itemId(t.getItemId())
                .transactionType(t.getTransactionType())
                .quantity(t.getQuantity())
                .notes(t.getNotes())
                .requestId(t.getRequestId())
                .performedBy(t.getPerformedBy())
                .createdAt(t.getCreatedAt())
                .build();
    }

    private InventoryItemResponseDTO toResponse(InventoryItemEntity i) {
        return InventoryItemResponseDTO.builder()
                .id(i.getId())
                .propertyId(i.getPropertyId())
                .itemCode(i.getItemCode())
                .itemNameAr(i.getItemNameAr())
                .itemNameEn(i.getItemNameEn())
                .unitOfMeasure(i.getUnitOfMeasure())
                .quantity(i.getQuantity())
                .minQuantity(i.getMinQuantity())
                .location(i.getLocation())
                .lowStock(i.isLowStock())
                .active(i.isActive())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
