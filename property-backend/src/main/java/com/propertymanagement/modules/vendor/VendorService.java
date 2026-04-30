package com.propertymanagement.modules.vendor;

import com.propertymanagement.modules.vendor.dto.VendorRequest;
import com.propertymanagement.modules.vendor.dto.VendorResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository repository;

    public Page<VendorResponse> getAll(Pageable pageable, String q, Long propertyId) {
        return repository.search(trimToNull(q), propertyId, pageable).map(this::toResponse);
    }

    public VendorResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public VendorResponse create(VendorRequest request) {
        Vendor vendor = Vendor.builder()
                .vendorCode(generateCode())
                .propertyId(request.getPropertyId())
                .vendorName(request.getVendorName().trim())
                .vendorType(trimToNull(request.getVendorType()))
                .contactPerson(trimToNull(request.getContactPerson()))
                .phone(trimToNull(request.getPhone()))
                .email(trimToNull(request.getEmail()))
                .address(trimToNull(request.getAddress()))
                .notes(trimToNull(request.getNotes()))
                .build();
        return toResponse(repository.save(vendor));
    }

    private Vendor find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Vendor not found: " + id));
    }

    private VendorResponse toResponse(Vendor vendor) {
        return VendorResponse.builder()
                .id(vendor.getId())
                .propertyId(vendor.getPropertyId())
                .vendorCode(vendor.getVendorCode())
                .vendorName(vendor.getVendorName())
                .vendorType(vendor.getVendorType())
                .contactPerson(vendor.getContactPerson())
                .phone(vendor.getPhone())
                .email(vendor.getEmail())
                .rating(vendor.getRating())
                .totalJobs(vendor.getTotalJobs())
                .active(vendor.isActive())
                .createdAt(vendor.getCreatedAt())
                .updatedAt(vendor.getUpdatedAt())
                .build();
    }

    private String generateCode() {
        return "VND-" + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
