package com.propertymanagement.modules.vendor.service;

import com.propertymanagement.modules.vendor.entity.VendorEntity;
import com.propertymanagement.modules.vendor.repository.VendorRepository;
import com.propertymanagement.modules.vendor.dto.VendorRequestDTO;
import com.propertymanagement.modules.vendor.dto.VendorResponseDTO;
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

    public Page<VendorResponseDTO> getAll(Pageable pageable, String q, Long propertyId) {
        return repository.search(trimToNull(q), propertyId, pageable).map(this::toResponse);
    }

    public VendorResponseDTO getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public VendorResponseDTO create(VendorRequestDTO request) {
        String nameAr = firstNonBlank(request.getVendorNameAr(), request.getVendorName());
        String nameEn = firstNonBlank(request.getVendorNameEn(), request.getVendorName());
        String legacyName = firstNonBlank(request.getVendorName(), nameAr, nameEn);
        if (legacyName == null) {
            throw AppException.badRequest("Vendor name is required");
        }
        VendorEntity vendor = VendorEntity.builder()
                .vendorCode(generateCode())
                .propertyId(request.getPropertyId())
                .vendorName(legacyName)
                .vendorNameAr(nameAr != null ? nameAr : legacyName)
                .vendorNameEn(nameEn != null ? nameEn : legacyName)
                .vendorType(trimToNull(request.getVendorType()))
                .contactPerson(trimToNull(request.getContactPerson()))
                .phone(trimToNull(request.getPhone()))
                .email(trimToNull(request.getEmail()))
                .address(trimToNull(request.getAddress()))
                .notes(trimToNull(request.getNotes()))
                .build();
        return toResponse(repository.save(vendor));
    }

    private VendorEntity find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Vendor not found: " + id));
    }

    private VendorResponseDTO toResponse(VendorEntity vendor) {
        return VendorResponseDTO.builder()
                .id(vendor.getId())
                .propertyId(vendor.getPropertyId())
                .vendorCode(vendor.getVendorCode())
                .vendorName(vendor.getVendorName())
                .vendorNameAr(vendor.getVendorNameAr())
                .vendorNameEn(vendor.getVendorNameEn())
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

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String trimmed = trimToNull(value);
            if (trimmed != null) {
                return trimmed;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
