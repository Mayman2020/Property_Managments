package com.propertymanagement.modules.vacancy;

import com.propertymanagement.modules.vacancy.dto.RentalInquiryResponse;
import com.propertymanagement.modules.vacancy.dto.VacancyListingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VacancyService {

    private final VacancyRepository vacancyRepository;
    private final InquiryRepository inquiryRepository;

    public Page<VacancyListingResponse> getListings(Pageable pageable, String q) {
        return vacancyRepository.search(trimToNull(q), pageable).map(row -> VacancyListingResponse.builder()
                .id(row.getId())
                .titleAr(row.getTitleAr())
                .titleEn(row.getTitleEn())
                .propertyName(row.getPropertyName())
                .unitNumber(row.getUnitNumber())
                .askingRent(row.getAskingRent())
                .availableFrom(row.getAvailableFrom())
                .isPublished(row.getIsPublished())
                .viewsCount(row.getViewsCount())
                .build());
    }

    public List<RentalInquiryResponse> getInquiries(Long listingId) {
        return inquiryRepository.findRowsByListingId(listingId).stream()
                .map(row -> RentalInquiryResponse.builder()
                        .id(row.getId())
                        .inquirerName(row.getInquirerName())
                        .inquirerPhone(row.getInquirerPhone())
                        .inquirerEmail(row.getInquirerEmail())
                        .status(row.getStatus())
                        .preferredStart(row.getPreferredStart())
                        .build())
                .toList();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
