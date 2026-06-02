package com.propertymanagement.modules.vacancy.controller;

import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.vacancy.dto.ConvertInquiryResponse;
import com.propertymanagement.modules.vacancy.dto.CreateVacancyRequest;
import com.propertymanagement.modules.vacancy.dto.CreateInquiryRequest;
import com.propertymanagement.modules.vacancy.dto.RentalInquiryResponseDTO;
import com.propertymanagement.modules.vacancy.dto.UpdateInquiryStatusRequest;
import com.propertymanagement.modules.vacancy.dto.VacancyListingResponseDTO;
import com.propertymanagement.modules.vacancy.service.VacancyService;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vacancies")
@RequiredArgsConstructor
public class VacancyController {

    private final VacancyService service;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<VacancyListingResponseDTO>> create(
            @Valid @RequestBody CreateVacancyRequest request,
            @AuthenticationPrincipal User user) {
        Long actorId = user != null ? user.getId() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createListing(request, actorId)));
    }

    @PatchMapping("/by-unit/{unitId}/unpublish")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<VacancyListingResponseDTO>> unpublish(@PathVariable Long unitId) {
        return ResponseEntity.ok(ApiResponse.ok(service.unpublishListing(unitId)));
    }

    @GetMapping("/by-unit/{unitId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<VacancyListingResponseDTO>> byUnit(@PathVariable Long unitId) {
        VacancyListingResponseDTO dto = service.getByUnitId(unitId);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<VacancyListingResponseDTO>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) Long ownerId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getListings(pageable, q, propertyId, ownerId)));
    }

    @GetMapping("/{id}/inquiries")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<RentalInquiryResponseDTO>>> inquiries(@PathVariable("id") Long listingId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getInquiries(listingId)));
    }

    @PostMapping("/{listingId}/inquiries")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<RentalInquiryResponseDTO>> createInquiry(
            @PathVariable Long listingId,
            @Valid @RequestBody CreateInquiryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.createInquiry(listingId, request)));
    }

    @PatchMapping("/inquiries/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<RentalInquiryResponseDTO>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInquiryStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateInquiryStatus(id, request)));
    }

    @PostMapping("/inquiries/{id}/convert")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ConvertInquiryResponse>> convert(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        Long actorId = user != null ? user.getId() : null;
        return ResponseEntity.ok(ApiResponse.ok(service.convertInquiry(id, actorId)));
    }
}
