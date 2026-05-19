package com.propertymanagement.modules.inventory.controller;

import com.propertymanagement.modules.inventory.service.InventoryService;
import com.propertymanagement.modules.inventory.dto.BulkTransactionRequestDTO;
import com.propertymanagement.modules.inventory.dto.InventoryItemRequestDTO;
import com.propertymanagement.modules.inventory.dto.InventoryItemResponseDTO;
import com.propertymanagement.modules.inventory.dto.InventoryTransactionResponseDTO;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequestDTO;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.property.entity.Property;

@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InventoryItemResponseDTO>>> getAll(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getAll(pageable, q)));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<Page<InventoryItemResponseDTO>>> getByProperty(
            @PathVariable Long propertyId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getByProperty(propertyId, pageable, q)));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryItemResponseDTO>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLowStock()));
    }

    @GetMapping("/low-stock/property/{propertyId}")
    public ResponseEntity<ApiResponse<List<InventoryItemResponseDTO>>> getLowStockByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLowStockByProperty(propertyId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItemResponseDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(module = "inventory", action = "create")
    public ResponseEntity<ApiResponse<InventoryItemResponseDTO>> create(
            @Valid @RequestBody InventoryItemRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inventoryService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "inventory", action = "edit")
    public ResponseEntity<ApiResponse<InventoryItemResponseDTO>> update(
            @PathVariable Long id, @Valid @RequestBody InventoryItemRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.update(id, request)));
    }

    @PostMapping("/{id}/stock")
    @RequiresPermission(module = "inventory", action = "edit")
    public ResponseEntity<ApiResponse<InventoryItemResponseDTO>> adjustStock(
            @PathVariable Long id, @Valid @RequestBody StockTransactionRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.adjustStock(id, request)));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<Page<InventoryTransactionResponseDTO>>> getTransactions(
            @RequestParam(required = false) Long itemId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getTransactions(itemId, pageable)));
    }

    @PostMapping("/transactions")
    @RequiresPermission(module = "inventory", action = "create")
    public ResponseEntity<ApiResponse<InventoryItemResponseDTO>> createTransaction(
            @Valid @RequestBody BulkTransactionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inventoryService.createTransaction(request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "inventory", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        inventoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
