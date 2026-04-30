package com.propertymanagement.modules.inspection;

import com.propertymanagement.modules.inspection.dto.InspectionRequest;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inspections")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER')")
public class UnitInspectionController {

    private final UnitInspectionService inspectionService;

    @GetMapping("/unit/{unitId}")
    public ResponseEntity<ApiResponse<List<UnitInspection>>> getByUnit(@PathVariable Long unitId) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.getByUnit(unitId)));
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<ApiResponse<List<UnitInspection>>> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.getByContract(contractId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UnitInspection>> create(
            @Valid @RequestBody InspectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(inspectionService.create(request)));
    }
}
