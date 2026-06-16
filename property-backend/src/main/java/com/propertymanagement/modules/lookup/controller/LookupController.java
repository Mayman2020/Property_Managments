package com.propertymanagement.modules.lookup.controller;

import com.propertymanagement.modules.lookup.entity.LookupType;
import com.propertymanagement.modules.lookup.service.LookupService;
import com.propertymanagement.modules.lookup.dto.CreateCityRequestDTO;
import com.propertymanagement.modules.lookup.dto.CreateClassificationRequestDTO;
import com.propertymanagement.modules.lookup.dto.CreateCountryRequestDTO;
import com.propertymanagement.modules.lookup.dto.LookupResponseDTO;
import com.propertymanagement.modules.lookup.dto.UpdateLookupRequestDTO;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lookups")
@RequiredArgsConstructor
public class LookupController {

    private final LookupService lookupService;

    @GetMapping("/countries")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LookupResponseDTO>>> getCountries() {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getCountries()));
    }

    @GetMapping("/countries/oman")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LookupResponseDTO>> getOmanCountry() {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getOmanCountry()));
    }

    @GetMapping("/cities")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LookupResponseDTO>>> getCities(@RequestParam Long countryId) {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getCities(countryId)));
    }

    @GetMapping("/by-type")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LookupResponseDTO>>> getByType(@RequestParam LookupType type) {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getByType(type)));
    }

    @GetMapping("/classifications")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LookupResponseDTO>>> getAllByType(@RequestParam LookupType type) {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getAllByType(type)));
    }

    @PostMapping("/countries")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponseDTO>> createCountry(@Valid @RequestBody CreateCountryRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lookupService.createCountry(request)));
    }

    @PostMapping("/cities")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponseDTO>> createCity(@Valid @RequestBody CreateCityRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lookupService.createCity(request)));
    }

    @PostMapping("/classifications")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponseDTO>> createClassification(@Valid @RequestBody CreateClassificationRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lookupService.createClassification(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponseDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLookupRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        lookupService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
