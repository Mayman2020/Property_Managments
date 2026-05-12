package com.propertymanagement.modules.property.controller;

import com.propertymanagement.modules.property.dto.FloorRequest;
import com.propertymanagement.modules.property.dto.FloorResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.property.service.FloorService;

@RestController
@RequestMapping("/properties/{propertyId}/floors")
@RequiredArgsConstructor
public class FloorController {

    private final FloorService floorService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FloorResponse>>> getByProperty(@PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(floorService.getByProperty(propertyId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<FloorResponse>> create(
            @PathVariable Long propertyId,
            @Valid @RequestBody FloorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(floorService.create(propertyId, request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<FloorResponse>> update(
            @PathVariable Long propertyId,
            @PathVariable Long id,
            @Valid @RequestBody FloorRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(floorService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long propertyId,
            @PathVariable Long id) {
        floorService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
