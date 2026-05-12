package com.propertymanagement.modules.inventory;

import com.propertymanagement.modules.inventory.entity.InventoryItemEntity;
import com.propertymanagement.modules.inventory.entity.InventoryTransactionEntity;
import com.propertymanagement.modules.inventory.dto.InventoryItemRequestDTO;
import com.propertymanagement.modules.inventory.dto.InventoryItemResponseDTO;
import com.propertymanagement.modules.inventory.dto.StockTransactionRequestDTO;
import com.propertymanagement.modules.inventory.repository.InventoryRepository;
import com.propertymanagement.modules.inventory.repository.InventoryTransactionRepository;
import com.propertymanagement.modules.inventory.service.InventoryService;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock InventoryRepository inventoryRepository;
    @Mock InventoryTransactionRepository transactionRepository;
    @Mock OwnerPropertyAccessService ownerPropertyAccessService;

    @InjectMocks InventoryService service;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        setSecurityContext(adminUser);
    }

    // ── CREATE ────────────────────────────────────────────────────────────

    @Test
    void create_savesItemWithDefaults() {
        InventoryItemEntity saved = buildItem(1L, BigDecimal.valueOf(10), BigDecimal.valueOf(2));
        when(inventoryRepository.save(any())).thenReturn(saved);

        InventoryItemRequestDTO req = buildItemRequest("Paint", 10L);
        InventoryItemResponseDTO result = service.create(req);

        assertThat(result.getId()).isEqualTo(1L);
        verify(inventoryRepository).save(any(InventoryItemEntity.class));
    }

    @Test
    void create_throwsForbidden_whenCalledByOwner() {
        doThrow(AppException.forbidden("Owners cannot create inventory items"))
                .when(ownerPropertyAccessService).denyOwnerMutation(anyString());

        assertThatThrownBy(() -> service.create(buildItemRequest("Paint", 10L)))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Owners cannot create");
    }

    // ── ADJUST STOCK VALIDATION ───────────────────────────────────────────

    @Test
    void adjustStock_throwsBadRequest_whenQuantityIsZero() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(10), BigDecimal.valueOf(2));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("IN");
        req.setQuantity(BigDecimal.ZERO);

        assertThatThrownBy(() -> service.adjustStock(1L, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("greater than zero");
    }

    @Test
    void adjustStock_throwsBadRequest_whenQuantityIsNegative() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(10), BigDecimal.valueOf(2));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("OUT");
        req.setQuantity(BigDecimal.valueOf(-5));

        assertThatThrownBy(() -> service.adjustStock(1L, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("greater than zero");
    }

    // ── ADJUST STOCK IN ───────────────────────────────────────────────────

    @Test
    void adjustStock_in_increasesQuantity() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(10), BigDecimal.valueOf(2));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.save(any())).thenReturn(item);
        when(transactionRepository.save(any())).thenReturn(mock(InventoryTransactionEntity.class));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("IN");
        req.setQuantity(BigDecimal.valueOf(5));

        InventoryItemResponseDTO result = service.adjustStock(1L, req);

        verify(inventoryRepository).save(argThat(i -> i.getQuantity().compareTo(BigDecimal.valueOf(15)) == 0));
    }

    // ── ADJUST STOCK OUT ──────────────────────────────────────────────────

    @Test
    void adjustStock_out_decreasesQuantity() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(10), BigDecimal.valueOf(2));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.save(any())).thenReturn(item);
        when(transactionRepository.save(any())).thenReturn(mock(InventoryTransactionEntity.class));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("OUT");
        req.setQuantity(BigDecimal.valueOf(3));

        service.adjustStock(1L, req);

        verify(inventoryRepository).save(argThat(i -> i.getQuantity().compareTo(BigDecimal.valueOf(7)) == 0));
    }

    @Test
    void adjustStock_out_throwsBadRequest_whenInsufficientStock() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(2), BigDecimal.valueOf(1));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("OUT");
        req.setQuantity(BigDecimal.valueOf(5)); // More than available

        assertThatThrownBy(() -> service.adjustStock(1L, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Insufficient stock");
    }

    @Test
    void adjustStock_out_throwsBadRequest_whenExactlyZeroStock() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.ZERO, BigDecimal.valueOf(1));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("OUT");
        req.setQuantity(BigDecimal.valueOf(1));

        assertThatThrownBy(() -> service.adjustStock(1L, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Insufficient stock");
    }

    @Test
    void adjustStock_createsTransactionRecord() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(10), BigDecimal.valueOf(2));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.save(any())).thenReturn(item);
        when(transactionRepository.save(any())).thenReturn(mock(InventoryTransactionEntity.class));

        StockTransactionRequestDTO req = new StockTransactionRequestDTO();
        req.setType("IN");
        req.setQuantity(BigDecimal.valueOf(3));
        req.setNotes("restocking");

        service.adjustStock(1L, req);

        verify(transactionRepository).save(argThat(t ->
                "IN".equals(t.getTransactionType())
                && t.getQuantity().compareTo(BigDecimal.valueOf(3)) == 0
                && "restocking".equals(t.getNotes())));
    }

    // ── LOW STOCK ─────────────────────────────────────────────────────────

    @Test
    void getLowStock_returnsItemsBelowMinQuantity() {
        InventoryItemEntity lowItem = buildItem(1L, BigDecimal.valueOf(1), BigDecimal.valueOf(5));
        when(ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner()).thenReturn(null);
        when(inventoryRepository.findLowStock()).thenReturn(List.of(lowItem));

        List<InventoryItemResponseDTO> result = service.getLowStock();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isLowStock()).isTrue();
    }

    @Test
    void getLowStock_returnsEmpty_whenOwnerHasNoProperties() {
        when(ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner())
                .thenReturn(java.util.Collections.emptySet());

        List<InventoryItemResponseDTO> result = service.getLowStock();

        assertThat(result).isEmpty();
        verifyNoInteractions(inventoryRepository);
    }

    // ── DELETE ────────────────────────────────────────────────────────────

    @Test
    void delete_softDeletesItem() {
        InventoryItemEntity item = buildItem(1L, BigDecimal.valueOf(5), BigDecimal.valueOf(2));
        when(inventoryRepository.findById(1L)).thenReturn(Optional.of(item));
        when(inventoryRepository.save(any())).thenReturn(item);

        service.delete(1L);

        verify(inventoryRepository).save(argThat(i -> !i.isActive()));
    }

    @Test
    void delete_throwsNotFound_whenItemDoesNotExist() {
        when(inventoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(AppException.class);
    }

    // ── HELPERS ──────────────────────────────────────────────────────────

    private InventoryItemEntity buildItem(Long id, BigDecimal quantity, BigDecimal minQty) {
        return InventoryItemEntity.builder()
                .id(id)
                .propertyId(10L)
                .itemCode("ITEM-" + id)
                .itemNameAr("صنف " + id)
                .itemNameEn("Item " + id)
                .unitOfMeasure("pcs")
                .quantity(quantity)
                .minQuantity(minQty)
                .active(true)
                .build();
    }

    private InventoryItemRequestDTO buildItemRequest(String name, Long propertyId) {
        InventoryItemRequestDTO req = new InventoryItemRequestDTO();
        req.setPropertyId(propertyId);
        req.setItemCode("CODE-001");
        req.setItemNameAr("صنف");
        req.setItemNameEn(name);
        req.setUnitOfMeasure("pcs");
        req.setQuantity(BigDecimal.TEN);
        req.setMinQuantity(BigDecimal.valueOf(2));
        return req;
    }

    private void setSecurityContext(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null,
                        user.getAuthorities() != null ? user.getAuthorities() : List.of()));
    }
}
