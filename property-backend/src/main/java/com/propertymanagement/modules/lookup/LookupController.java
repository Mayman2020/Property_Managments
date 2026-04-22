package com.propertymanagement.modules.lookup;

import com.propertymanagement.modules.lookup.dto.CreateCityRequest;
import com.propertymanagement.modules.lookup.dto.CreateCountryRequest;
import com.propertymanagement.modules.lookup.dto.LookupResponse;
import com.propertymanagement.modules.lookup.dto.UpdateLookupRequest;
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
    public ResponseEntity<ApiResponse<List<LookupResponse>>> getCountries() {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getCountries()));
    }

    @GetMapping("/countries/oman")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LookupResponse>> getOmanCountry() {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getOmanCountry()));
    }

    @GetMapping("/cities")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LookupResponse>>> getCities(@RequestParam Long countryId) {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.getCities(countryId)));
    }

    @PostMapping("/countries")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponse>> createCountry(@Valid @RequestBody CreateCountryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lookupService.createCountry(request)));
    }

    @PostMapping("/cities")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponse>> createCity(@Valid @RequestBody CreateCityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lookupService.createCity(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<LookupResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLookupRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(lookupService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        lookupService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
