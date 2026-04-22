package com.propertymanagement.modules.inventory;

import com.propertymanagement.modules.inventory.dto.InventoryItemRequest;
import com.propertymanagement.modules.inventory.dto.InventoryItemResponse;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequest;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InventoryItemResponse>>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getAll(pageable)));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<Page<InventoryItemResponse>>> getByProperty(
            @PathVariable Long propertyId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getByProperty(propertyId, pageable)));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryItemResponse>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLowStock()));
    }

    @GetMapping("/low-stock/property/{propertyId}")
    public ResponseEntity<ApiResponse<List<InventoryItemResponse>>> getLowStockByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLowStockByProperty(propertyId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItemResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<InventoryItemResponse>> create(
            @Valid @RequestBody InventoryItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inventoryService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<InventoryItemResponse>> update(
            @PathVariable Long id, @Valid @RequestBody InventoryItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.update(id, request)));
    }

    @PostMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER')")
    public ResponseEntity<ApiResponse<InventoryItemResponse>> adjustStock(
            @PathVariable Long id, @Valid @RequestBody StockTransactionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.adjustStock(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        inventoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
