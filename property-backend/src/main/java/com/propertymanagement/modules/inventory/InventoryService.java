package com.propertymanagement.modules.inventory;

import com.propertymanagement.modules.inventory.dto.BulkTransactionRequest;
import com.propertymanagement.modules.inventory.dto.InventoryItemRequest;
import com.propertymanagement.modules.inventory.dto.InventoryItemResponse;
import com.propertymanagement.modules.inventory.dto.InventoryTransactionResponse;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequest;
import com.propertymanagement.modules.user.User;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository transactionRepository;

    public Page<InventoryItemResponse> getAll(Pageable pageable, String q) {
        return inventoryRepository.searchActive(trimToNull(q), pageable).map(this::toResponse);
    }

    public Page<InventoryItemResponse> getByProperty(Long propertyId, Pageable pageable, String q) {
        return inventoryRepository.searchByPropertyActive(propertyId, trimToNull(q), pageable).map(this::toResponse);
    }

    public List<InventoryItemResponse> getLowStock() {
        return inventoryRepository.findLowStock().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<InventoryItemResponse> getLowStockByProperty(Long propertyId) {
        return inventoryRepository.findLowStockByProperty(propertyId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public InventoryItemResponse getById(Long id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public InventoryItemResponse create(InventoryItemRequest request) {
        InventoryItem item = InventoryItem.builder()
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
    public InventoryItemResponse update(Long id, InventoryItemRequest request) {
        InventoryItem item = findActive(id);
        item.setItemNameAr(request.getItemNameAr());
        item.setItemNameEn(request.getItemNameEn());
        item.setUnitOfMeasure(request.getUnitOfMeasure());
        item.setMinQuantity(request.getMinQuantity() != null ? request.getMinQuantity() : BigDecimal.ZERO);
        item.setLocation(request.getLocation());
        return toResponse(inventoryRepository.save(item));
    }

    @Transactional
    public InventoryItemResponse adjustStock(Long id, StockTransactionRequest request) {
        InventoryItem item = findActive(id);
        BigDecimal qty = request.getQuantity();

        if ("OUT".equalsIgnoreCase(request.getType())) {
            if (item.getQuantity().compareTo(qty) < 0) {
                throw AppException.badRequest("Insufficient stock. Available: " + item.getQuantity());
            }
            item.setQuantity(item.getQuantity().subtract(qty));
        } else {
            item.setQuantity(item.getQuantity().add(qty));
        }

        InventoryItem saved = inventoryRepository.save(item);

        InventoryTransaction transaction = InventoryTransaction.builder()
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

    public Page<InventoryTransactionResponse> getTransactions(Long itemId, Pageable pageable) {
        Page<InventoryTransaction> page = (itemId != null)
                ? transactionRepository.findByItemId(itemId, pageable)
                : transactionRepository.findAll(pageable);
        return page.map(this::toTransactionResponse);
    }

    @Transactional
    public InventoryItemResponse createTransaction(BulkTransactionRequest request) {
        StockTransactionRequest stock = new StockTransactionRequest();
        stock.setType(request.getTransactionType());
        stock.setQuantity(request.getQuantity());
        stock.setNotes(request.getNotes());
        stock.setRequestId(request.getRequestId());
        return adjustStock(request.getItemId(), stock);
    }

    @Transactional
    public void delete(Long id) {
        InventoryItem item = findActive(id);
        item.setActive(false);
        inventoryRepository.save(item);
    }

    private InventoryItem findActive(Long id) {
        return inventoryRepository.findById(id)
                .filter(InventoryItem::isActive)
                .orElseThrow(() -> AppException.notFound("Inventory item not found: " + id));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private InventoryTransactionResponse toTransactionResponse(InventoryTransaction t) {
        return InventoryTransactionResponse.builder()
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

    private InventoryItemResponse toResponse(InventoryItem i) {
        return InventoryItemResponse.builder()
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
