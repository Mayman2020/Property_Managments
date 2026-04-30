package com.propertymanagement.modules.lookup;

import com.propertymanagement.modules.lookup.dto.CreateCityRequest;
import com.propertymanagement.modules.lookup.dto.CreateClassificationRequest;
import com.propertymanagement.modules.lookup.dto.CreateCountryRequest;
import com.propertymanagement.modules.lookup.dto.LookupResponse;
import com.propertymanagement.modules.lookup.dto.UpdateLookupRequest;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LookupService {

    public static final String OMAN_COUNTRY_CODE = "OM";

    private final LookupRepository lookupRepository;

    public List<LookupResponse> getCountries() {
        return lookupRepository.findByTypeAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType.COUNTRY)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LookupResponse> getCities(Long countryId) {
        if (countryId == null) {
            return List.of();
        }
        return lookupRepository.findByTypeAndParentIdAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType.CITY, countryId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public LookupResponse getOmanCountry() {
        Lookup oman = lookupRepository.findByTypeAndCodeIgnoreCase(LookupType.COUNTRY, OMAN_COUNTRY_CODE)
                .orElseThrow(() -> AppException.notFound("Oman country lookup not found"));
        return toResponse(oman);
    }

    @Transactional
    public LookupResponse createCountry(CreateCountryRequest request) {
        String code = resolveCountryCode(request.getCode());
        if (lookupRepository.existsByTypeAndCodeIgnoreCase(LookupType.COUNTRY, code)) {
            throw AppException.conflict("Country code already exists: " + code);
        }

        Lookup country = Lookup.builder()
                .type(LookupType.COUNTRY)
                .code(code)
                .nameAr(request.getNameAr().trim())
                .nameEn(request.getNameEn().trim())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .active(true)
                .locked(false)
                .build();

        return toResponse(lookupRepository.save(country));
    }

    @Transactional
    public LookupResponse createCity(CreateCityRequest request) {
        Lookup country = lookupRepository.findById(request.getCountryId())
                .filter((l) -> l.getType() == LookupType.COUNTRY)
                .orElseThrow(() -> AppException.badRequest("Valid country is required"));

        String code = resolveCityCode(request.getCountryId(), request.getCode());
        if (lookupRepository.existsByTypeAndCodeIgnoreCase(LookupType.CITY, code)) {
            throw AppException.conflict("City code already exists: " + code);
        }

        Lookup city = Lookup.builder()
                .type(LookupType.CITY)
                .code(code)
                .nameAr(request.getNameAr().trim())
                .nameEn(request.getNameEn().trim())
                .parentId(country.getId())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .active(true)
                .locked(false)
                .build();

        return toResponse(lookupRepository.save(city));
    }

    @Transactional
    public LookupResponse update(Long id, UpdateLookupRequest request) {
        Lookup lookup = lookupRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Lookup not found: " + id));

        if (!lookup.isLocked()) {
            String code = normalizeCode(request.getCode());
            if (!code.equals(lookup.getCode()) &&
                lookupRepository.existsByTypeAndCodeIgnoreCase(lookup.getType(), code)) {
                throw AppException.conflict("Code already exists: " + code);
            }
            lookup.setCode(code);
        }

        lookup.setNameAr(request.getNameAr().trim());
        lookup.setNameEn(request.getNameEn().trim());
        lookup.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        lookup.setActive(request.isActive());

        return toResponse(lookupRepository.save(lookup));
    }

    public List<LookupResponse> getByType(LookupType type) {
        return lookupRepository.findByTypeAndActiveTrueOrderBySortOrderAscNameEnAsc(type)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LookupResponse> getAllByType(LookupType type) {
        return lookupRepository.findByTypeOrderBySortOrderAscNameEnAsc(type)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LookupResponse createClassification(CreateClassificationRequest request) {
        LookupType type = request.getType();
        String code = request.getCode() != null && !request.getCode().isBlank()
                ? normalizeCode(request.getCode())
                : generateClassificationCode(type);

        if (lookupRepository.existsByTypeAndCodeIgnoreCase(type, code)) {
            throw AppException.conflict("Code already exists: " + code);
        }

        Lookup item = Lookup.builder()
                .type(type)
                .code(code)
                .nameAr(request.getNameAr().trim())
                .nameEn(request.getNameEn().trim())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .active(true)
                .locked(false)
                .build();

        return toResponse(lookupRepository.save(item));
    }

    private String generateClassificationCode(LookupType type) {
        long base = lookupRepository.countByType(type) + 1;
        String prefix = type.name().substring(0, Math.min(3, type.name().length()));
        String candidate;
        do {
            candidate = prefix + "-" + base++;
        } while (lookupRepository.existsByTypeAndCodeIgnoreCase(type, candidate));
        return candidate;
    }

    @Transactional
    public void delete(Long id) {
        Lookup lookup = lookupRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Lookup not found: " + id));
        if (lookup.isLocked()) {
            throw AppException.badRequest("Cannot delete a locked lookup");
        }
        lookupRepository.delete(lookup);
    }

    private LookupResponse toResponse(Lookup lookup) {
        return LookupResponse.builder()
                .id(lookup.getId())
                .type(lookup.getType())
                .code(lookup.getCode())
                .nameAr(lookup.getNameAr())
                .nameEn(lookup.getNameEn())
                .parentId(lookup.getParentId())
                .sortOrder(lookup.getSortOrder())
                .active(lookup.isActive())
                .locked(lookup.isLocked())
                .build();
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String resolveCountryCode(String requested) {
        if (requested == null || requested.isBlank()) {
            return generateUniqueCountryCode();
        }
        return normalizeCode(requested);
    }

    private String resolveCityCode(Long countryId, String requested) {
        if (requested == null || requested.isBlank()) {
            return generateUniqueCityCode(countryId);
        }
        return normalizeCode(requested);
    }

    private String generateUniqueCountryCode() {
        long base = lookupRepository.countByType(LookupType.COUNTRY) + 1;
        String candidate;
        do {
            candidate = "CN-" + base++;
        } while (lookupRepository.existsByTypeAndCodeIgnoreCase(LookupType.COUNTRY, candidate));
        return candidate;
    }

    private String generateUniqueCityCode(Long countryId) {
        long base = lookupRepository.countByTypeAndParentId(LookupType.CITY, countryId) + 1;
        String candidate;
        do {
            candidate = "CT-" + countryId + "-" + base++;
        } while (lookupRepository.existsByTypeAndCodeIgnoreCase(LookupType.CITY, candidate));
        return candidate;
    }
}
