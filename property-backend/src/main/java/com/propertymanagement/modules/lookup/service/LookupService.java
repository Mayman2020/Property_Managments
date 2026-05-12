package com.propertymanagement.modules.LookupEntity.service;

import com.propertymanagement.modules.LookupEntity.entity.LookupEntity;
import com.propertymanagement.modules.LookupEntity.entity.LookupType;
import com.propertymanagement.modules.LookupEntity.repository.LookupRepository;
import com.propertymanagement.modules.LookupEntity.dto.CreateCityRequestDTO;
import com.propertymanagement.modules.LookupEntity.dto.CreateClassificationRequestDTO;
import com.propertymanagement.modules.LookupEntity.dto.CreateCountryRequestDTO;
import com.propertymanagement.modules.LookupEntity.dto.LookupResponseDTO;
import com.propertymanagement.modules.LookupEntity.dto.UpdateLookupRequestDTO;
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

    public List<LookupResponseDTO> getCountries() {
        return lookupRepository.findByTypeAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType.COUNTRY)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LookupResponseDTO> getCities(Long countryId) {
        if (countryId == null) {
            return List.of();
        }
        return lookupRepository.findByTypeAndParentIdAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType.CITY, countryId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public LookupResponseDTO getOmanCountry() {
        LookupEntity oman = lookupRepository.findByTypeAndCodeIgnoreCase(LookupType.COUNTRY, OMAN_COUNTRY_CODE)
                .orElseThrow(() -> AppException.notFound("Oman country LookupEntity not found"));
        return toResponse(oman);
    }

    @Transactional
    public LookupResponseDTO createCountry(CreateCountryRequestDTO request) {
        String code = resolveCountryCode(request.getCode());
        if (lookupRepository.existsByTypeAndCodeIgnoreCase(LookupType.COUNTRY, code)) {
            throw AppException.conflict("Country code already exists: " + code);
        }

        LookupEntity country = LookupEntity.builder()
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
    public LookupResponseDTO createCity(CreateCityRequestDTO request) {
        LookupEntity country = lookupRepository.findById(request.getCountryId())
                .filter((l) -> l.getType() == LookupType.COUNTRY)
                .orElseThrow(() -> AppException.badRequest("Valid country is required"));

        String code = resolveCityCode(request.getCountryId(), request.getCode());
        if (lookupRepository.existsByTypeAndCodeIgnoreCase(LookupType.CITY, code)) {
            throw AppException.conflict("City code already exists: " + code);
        }

        LookupEntity city = LookupEntity.builder()
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
    public LookupResponseDTO update(Long id, UpdateLookupRequestDTO request) {
        LookupEntity LookupEntity = lookupRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("LookupEntity not found: " + id));

        if (!LookupEntity.isLocked()) {
            String code = normalizeCode(request.getCode());
            if (!code.equals(LookupEntity.getCode()) &&
                lookupRepository.existsByTypeAndCodeIgnoreCase(LookupEntity.getType(), code)) {
                throw AppException.conflict("Code already exists: " + code);
            }
            LookupEntity.setCode(code);
        }

        LookupEntity.setNameAr(request.getNameAr().trim());
        LookupEntity.setNameEn(request.getNameEn().trim());
        LookupEntity.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        LookupEntity.setActive(request.isActive());

        return toResponse(lookupRepository.save(LookupEntity));
    }

    public List<LookupResponseDTO> getByType(LookupType type) {
        return lookupRepository.findByTypeAndActiveTrueOrderBySortOrderAscNameEnAsc(type)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<LookupResponseDTO> getAllByType(LookupType type) {
        return lookupRepository.findByTypeOrderBySortOrderAscNameEnAsc(type)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LookupResponseDTO createClassification(CreateClassificationRequestDTO request) {
        LookupType type = request.getType();
        String code = request.getCode() != null && !request.getCode().isBlank()
                ? normalizeCode(request.getCode())
                : generateClassificationCode(type);

        if (lookupRepository.existsByTypeAndCodeIgnoreCase(type, code)) {
            throw AppException.conflict("Code already exists: " + code);
        }

        LookupEntity item = LookupEntity.builder()
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
        LookupEntity LookupEntity = lookupRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("LookupEntity not found: " + id));
        if (LookupEntity.isLocked()) {
            throw AppException.badRequest("Cannot delete a locked LookupEntity");
        }
        lookupRepository.delete(LookupEntity);
    }

    private LookupResponseDTO toResponse(LookupEntity LookupEntity) {
        return LookupResponseDTO.builder()
                .id(LookupEntity.getId())
                .type(LookupEntity.getType())
                .code(LookupEntity.getCode())
                .nameAr(LookupEntity.getNameAr())
                .nameEn(LookupEntity.getNameEn())
                .parentId(LookupEntity.getParentId())
                .sortOrder(LookupEntity.getSortOrder())
                .active(LookupEntity.isActive())
                .locked(LookupEntity.isLocked())
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
