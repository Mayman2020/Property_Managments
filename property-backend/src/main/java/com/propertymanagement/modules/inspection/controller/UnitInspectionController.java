package com.propertymanagement.modules.inspection.controller;

import com.propertymanagement.modules.inspection.dto.*;
import com.propertymanagement.modules.inspection.service.UnitInspectionService;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/inspections")
@RequiredArgsConstructor
public class UnitInspectionController {

    private final UnitInspectionService inspectionService;

    @GetMapping("/{id}")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<InspectionResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.getById(id)));
    }

    @PostMapping("/{id}/items")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<InspectionItemResponse>> addItem(
            @PathVariable Long id,
            @Valid @RequestBody AddInspectionItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inspectionService.addItem(id, request)));
    }

    @PatchMapping("/{id}/items/{itemId}")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<InspectionItemResponse>> updateItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @RequestBody UpdateInspectionItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.updateItem(id, itemId, request)));
    }

    @PatchMapping("/{id}/complete")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<InspectionResponse>> complete(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.completeInspection(id)));
    }

    @PatchMapping("/{id}/sign")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<InspectionResponse>> sign(
            @PathVariable Long id,
            @Valid @RequestBody SignInspectionRequest request,
            @AuthenticationPrincipal User user) {
        Long actorId = user != null ? user.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                inspectionService.signInspection(id, request.getRole(), actorId)));
    }

    @PatchMapping("/{id}/link-damages")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<LinkDamagesResponse>> linkDamages(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.linkDamagesToDeposit(id)));
    }
}
