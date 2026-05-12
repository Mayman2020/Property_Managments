package com.propertymanagement.modules.vacancy.controller;

import com.propertymanagement.modules.vacancy.service.VacancyService;
import com.propertymanagement.modules.vacancy.dto.RentalInquiryResponseDTO;
import com.propertymanagement.modules.vacancy.dto.VacancyListingResponseDTO;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vacancies")
@RequiredArgsConstructor
public class VacancyController {

    private final VacancyService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<VacancyListingResponseDTO>>> list(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getListings(pageable, q)));
    }

    @GetMapping("/{id}/inquiries")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<RentalInquiryResponseDTO>>> inquiries(@PathVariable("id") Long listingId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getInquiries(listingId)));
    }
}
