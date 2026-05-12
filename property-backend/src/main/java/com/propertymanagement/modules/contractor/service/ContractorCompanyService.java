package com.propertymanagement.modules.contractor.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequestDTO;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponseDTO;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class ContractorCompanyService {

    private final ContractorCompanyRepository repository;
    private final MaintenanceContractRepository maintenanceContractRepository;
    private final UserRepository userRepository;
    private final PropertyScopeService propertyScopeService;

    public List<ContractorCompanyResponseDTO> listActive(String q) {
        return listActive(q, null);
    }

    public List<ContractorCompanyResponseDTO> listActive(String q, Long propertyId) {
        String trimmed = trimToNull(q);
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (scope != null) {
            if (scope.isEmpty()) return List.of();
            if (propertyId != null) {
                return scope.contains(propertyId)
                        ? repository.searchActiveInPropertyId(trimmed, propertyId).stream().map(this::toResponse).toList()
                        : List.of();
            }
            return repository.searchActiveInPropertyIds(trimmed, scope).stream().map(this::toResponse).toList();
        }
        if (propertyId != null) {
            return repository.searchActiveInPropertyId(trimmed, propertyId).stream().map(this::toResponse).toList();
        }
        return repository.searchActive(trimmed).stream().map(this::toResponse).toList();
    }

    public List<ContractorCompanyResponseDTO> listAll(String q) {
        return listAll(q, null);
    }

    public List<ContractorCompanyResponseDTO> listAll(String q, Long propertyId) {
        String trimmed = trimToNull(q);
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (scope != null) {
            if (scope.isEmpty()) return List.of();
            if (propertyId != null) {
                return scope.contains(propertyId)
                        ? repository.searchAllInPropertyId(trimmed, propertyId).stream().map(this::toResponse).toList()
                        : List.of();
            }
            return repository.searchAllInPropertyIds(trimmed, scope).stream().map(this::toResponse).toList();
        }
        if (propertyId != null) {
            return repository.searchAllInPropertyId(trimmed, propertyId).stream().map(this::toResponse).toList();
        }
        return repository.searchAll(trimmed).stream().map(this::toResponse).toList();
    }

    public ContractorCompanyResponseDTO get(Long id) {
        ContractorCompanyEntity company = find(id);
        assertCanAccessCompany(company.getId());
        return toResponse(company);
    }

    @Transactional
    public ContractorCompanyResponseDTO create(ContractorCompanyRequestDTO dto) {
        String nameAr = firstNonBlank(dto.getNameAr(), dto.getName(), dto.getNameEn());
        String nameEn = firstNonBlank(dto.getNameEn(), dto.getName(), dto.getNameAr());
        String legacyName = firstNonBlank(dto.getName(), nameAr, nameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Contractor name is required in Arabic and English");
        }
        validateContractFields(dto.getContractStart(), dto.getContractEnd(), dto.getAttachmentFiles());
        ContractorCompanyEntity e = ContractorCompanyEntity.builder()
                .name(legacyName)
                .nameAr(nameAr)
                .nameEn(nameEn)
                .phone(blankToNull(dto.getPhone()))
                .email(blankToNull(dto.getEmail()))
                .profileImageUrl(blankToNull(dto.getProfileImageUrl()))
                .civilIdImageUrl(blankToNull(dto.getCivilIdImageUrl()))
                .notes(blankToNull(dto.getNotes()))
                .contractStart(dto.getContractStart())
                .contractEnd(dto.getContractEnd())
                .attachmentFiles(new ArrayList<>(normalizeFiles(dto.getAttachmentFiles())))
                .active(dto.getActive() == null || dto.getActive())
                .build();
        return toResponse(repository.save(e));
    }

    @Transactional
    public ContractorCompanyResponseDTO update(Long id, ContractorCompanyRequestDTO dto) {
        ContractorCompanyEntity e = find(id);
        String nameAr = firstNonBlank(dto.getNameAr(), dto.getName(), dto.getNameEn());
        String nameEn = firstNonBlank(dto.getNameEn(), dto.getName(), dto.getNameAr());
        String legacyName = firstNonBlank(dto.getName(), nameAr, nameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Contractor name is required in Arabic and English");
        }
        boolean contractTouched =
                dto.getContractStart() != null || dto.getContractEnd() != null || dto.getAttachmentFiles() != null;
        if (contractTouched) {
            LocalDate effectiveStart = dto.getContractStart() != null ? dto.getContractStart() : e.getContractStart();
            LocalDate effectiveEnd = dto.getContractEnd() != null ? dto.getContractEnd() : e.getContractEnd();
            List<String> effectiveFiles = dto.getAttachmentFiles() != null ? dto.getAttachmentFiles() : e.getAttachmentFiles();
            validateContractFields(effectiveStart, effectiveEnd, effectiveFiles);
            e.setContractStart(effectiveStart);
            e.setContractEnd(effectiveEnd);
            e.setAttachmentFiles(new ArrayList<>(normalizeFiles(effectiveFiles)));
        }

        e.setName(legacyName);
        e.setNameAr(nameAr);
        e.setNameEn(nameEn);
        e.setPhone(blankToNull(dto.getPhone()));
        e.setEmail(blankToNull(dto.getEmail()));
        e.setProfileImageUrl(blankToNull(dto.getProfileImageUrl()));
        e.setCivilIdImageUrl(blankToNull(dto.getCivilIdImageUrl()));
        e.setNotes(blankToNull(dto.getNotes()));
        if (dto.getActive() != null) {
            e.setActive(dto.getActive());
        }
        return toResponse(repository.save(e));
    }

    @Transactional
    public void delete(Long id) {
        ContractorCompanyEntity company = find(id);
        LocalDate today = LocalDate.now();
        if (maintenanceContractRepository.existsActiveOngoingForContractor(id, today)) {
            throw AppException.badRequest(
                    "Cannot delete this maintenance contractor company: it has an active maintenance contract with a property that is still in effect.");
        }
        repository.delete(company);
    }

    private ContractorCompanyEntity find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Contractor company not found: " + id));
    }

    private void assertCanAccessCompany(Long companyId) {
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (scope == null) {
            return;
        }
        if (scope.isEmpty() || repository.countLinkedToPropertyIds(companyId, scope) == 0) {
            throw AppException.forbidden("You do not have access to this contractor company");
        }
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private ContractorCompanyResponseDTO toResponse(ContractorCompanyEntity e) {
        String nameAr = firstNonBlank(e.getNameAr(), e.getName(), e.getNameEn());
        String nameEn = firstNonBlank(e.getNameEn(), e.getName(), e.getNameAr());
        MaintenanceContract latestContract = maintenanceContractRepository
                .findFirstByContractorCompanyIdOrderByCreatedAtDesc(e.getId())
                .orElse(null);
        return ContractorCompanyResponseDTO.builder()
                .id(e.getId())
                .name(LocalizedNameResolver.resolve(nameAr, nameEn, e.getName()))
                .nameAr(nameAr)
                .nameEn(nameEn)
                .phone(e.getPhone())
                .email(e.getEmail())
                .profileImageUrl(e.getProfileImageUrl())
                .civilIdImageUrl(e.getCivilIdImageUrl())
                .notes(e.getNotes())
                .active(e.isActive())
                .latestMaintenanceContractStatus(latestContract != null ? latestContract.getStatus() : null)
                .latestMaintenanceContractOwnerApprovalStatus(latestContract != null ? latestContract.getOwnerApprovalStatus() : null)
                .latestMaintenanceContractNumber(latestContract != null ? latestContract.getContractNumber() : null)
                .contractStart(e.getContractStart())
                .contractEnd(e.getContractEnd())
                .attachmentFiles(e.getAttachmentFiles() == null ? List.of() : List.copyOf(e.getAttachmentFiles()))
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .createdBy(e.getCreatedBy())
                .createdByName(resolveUserName(e.getCreatedBy()))
                .modifiedBy(e.getModifiedBy())
                .modifiedByName(resolveUserName(e.getModifiedBy()))
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private void validateContractFields(LocalDate start, LocalDate end, List<String> files) {
        if (start == null || end == null) {
            throw AppException.badRequest("Contract start and end dates are required");
        }
        if (end.isBefore(start)) {
            throw AppException.badRequest("Contract end date must be on or after contract start date");
        }
        List<String> normalized = normalizeFiles(files);
        if (normalized.isEmpty()) {
            throw AppException.badRequest("At least one contract attachment is required");
        }
    }

    private List<String> normalizeFiles(List<String> files) {
        if (files == null) {
            return List.of();
        }
        return files.stream()
                .map((f) -> f == null ? "" : f.trim())
                .filter((f) -> !f.isEmpty())
                .distinct()
                .toList();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (LocalizedNameResolver.notBlank(value)) return value.trim();
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
