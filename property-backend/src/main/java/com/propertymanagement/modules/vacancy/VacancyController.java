package com.propertymanagement.modules.vacancy;

import com.propertymanagement.modules.vacancy.dto.RentalInquiryResponse;
import com.propertymanagement.modules.vacancy.dto.VacancyListingResponse;
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Page<VacancyListingResponse>>> list(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getListings(pageable, q)));
    }

    @GetMapping("/{id}/inquiries")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<RentalInquiryResponse>>> inquiries(@PathVariable("id") Long listingId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getInquiries(listingId)));
    }
}
