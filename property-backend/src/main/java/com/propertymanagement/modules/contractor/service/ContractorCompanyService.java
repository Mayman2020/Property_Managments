package com.propertymanagement.modules.contractor.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequestDTO;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponseDTO;
import com.propertymanagement.modules.contractor.dto.ContractorPropertyContractDto;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.service.UserService;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class ContractorCompanyService {

    private final ContractorCompanyRepository repository;
    private final MaintenanceContractRepository maintenanceContractRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final UserService userService;
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

    public Page<ContractorCompanyResponseDTO> getAll(
            Pageable pageable, String q, Long propertyId, Boolean active, boolean all) {
        String trimmed = trimToNull(q);
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        Page<ContractorCompanyEntity> page;
        if (scope != null) {
            if (scope.isEmpty()) {
                return Page.empty(pageable);
            }
            if (propertyId != null) {
                if (!scope.contains(propertyId)) {
                    return Page.empty(pageable);
                }
                page = all
                        ? repository.searchAllInPropertyIdPaged(trimmed, propertyId, active, pageable)
                        : repository.searchActiveInPropertyIdPaged(trimmed, propertyId, active, pageable);
            } else {
                page = all
                        ? repository.searchAllInPropertyIdsPaged(trimmed, scope, active, pageable)
                        : repository.searchActiveInPropertyIdsPaged(trimmed, scope, active, pageable);
            }
        } else if (propertyId != null) {
            page = all
                    ? repository.searchAllInPropertyIdPaged(trimmed, propertyId, active, pageable)
                    : repository.searchActiveInPropertyIdPaged(trimmed, propertyId, active, pageable);
        } else {
            page = all
                    ? repository.searchAllPaged(trimmed, active, pageable)
                    : repository.searchActivePaged(trimmed, active, pageable);
        }
        return page.map(this::toResponse);
    }

    public ContractorCompanyResponseDTO get(Long id) {
        ContractorCompanyEntity company = find(id);
        assertCanAccessCompany(company.getId());
        return toResponse(company);
    }

    @Transactional
    public ContractorCompanyResponseDTO create(ContractorCompanyRequestDTO dto) {
        String email = blankToNull(dto.getEmail());
        if (email == null) {
            throw AppException.badRequest("Email is required to create a maintenance company portal user");
        }
        if (dto.getPortalPropertyId() == null) {
            throw AppException.badRequest("Property is required to create a maintenance company portal user");
        }
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
                .email(email)
                .profileImageUrl(blankToNull(dto.getProfileImageUrl()))
                .civilIdImageUrl(blankToNull(dto.getCivilIdImageUrl()))
                .notes(blankToNull(dto.getNotes()))
                .contractStart(dto.getContractStart())
                .contractEnd(dto.getContractEnd())
                .attachmentFiles(new ArrayList<>(normalizeFiles(dto.getAttachmentFiles())))
                .active(dto.getActive() == null || dto.getActive())
                .build();
        ContractorCompanyEntity saved = repository.save(e);
        createMaintenanceCompanyUser(saved, dto, email);
        return toResponse(saved);
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
                    "Cannot delete this maintenance company: it has an active maintenance contract. Please close or cancel it first.");
        }
        // Delete the portal user account linked by email + MAINTENANCE_COMPANY role.
        if (company.getEmail() != null && !company.getEmail().isBlank()) {
            userRepository.findByEmailIgnoreCase(company.getEmail().trim())
                    .filter(u -> u.getRole() == UserRole.MAINTENANCE_COMPANY)
                    .ifPresent(u -> userService.delete(u.getId()));
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

    public List<ContractorPropertyContractDto> getMaintenanceContracts(Long id) {
        find(id);
        assertCanAccessCompany(id);
        List<MaintenanceContract> contracts = maintenanceContractRepository
                .findByContractorCompanyIdOrderByCreatedAtDesc(id);
        Set<Long> propertyIds = contracts.stream()
                .map(MaintenanceContract::getPropertyId)
                .collect(Collectors.toSet());
        Map<Long, Property> propMap = propertyRepository.findAllById(propertyIds).stream()
                .collect(Collectors.toMap(Property::getId, p -> p));
        return contracts.stream().map(mc -> {
            Property p = propMap.get(mc.getPropertyId());
            return ContractorPropertyContractDto.builder()
                    .contractId(mc.getId())
                    .contractNumber(mc.getContractNumber())
                    .propertyId(mc.getPropertyId())
                    .propertyNameAr(p != null ? firstNonBlank(p.getPropertyNameAr(), p.getPropertyName()) : null)
                    .propertyNameEn(p != null ? firstNonBlank(p.getPropertyNameEn(), p.getPropertyName()) : null)
                    .startDate(mc.getStartDate())
                    .endDate(mc.getEndDate())
                    .status(mc.getStatus())
                    .slaHours(mc.getSlaHours())
                    .contractValue(mc.getContractValue())
                    .createdAt(mc.getCreatedAt())
                    .build();
        }).toList();
    }

    private ContractorCompanyResponseDTO toResponse(ContractorCompanyEntity e) {
        String nameAr = firstNonBlank(e.getNameAr(), e.getName(), e.getNameEn());
        String nameEn = firstNonBlank(e.getNameEn(), e.getName(), e.getNameAr());
        List<MaintenanceContract> allContracts = maintenanceContractRepository
                .findByContractorCompanyIdOrderByCreatedAtDesc(e.getId());
        MaintenanceContract latestContract = allContracts.isEmpty() ? null : allContracts.get(0);
        long distinctProperties = allContracts.stream()
                .map(MaintenanceContract::getPropertyId).distinct().count();
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
                .latestContractStart(latestContract != null ? latestContract.getStartDate() : null)
                .latestContractEnd(latestContract != null ? latestContract.getEndDate() : null)
                .latestContractValue(latestContract != null ? latestContract.getContractValue() : null)
                .propertiesCount((int) distinctProperties)
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

    private Set<Long> maintenanceCompanyPortalIds(Long propertyId) {
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        return userRepository.findByRoleAndActiveTrue(UserRole.MAINTENANCE_COMPANY).stream()
                .filter(u -> u.getContractorCompanyId() != null)
                .filter(u -> propertyId == null || propertyId.equals(u.getPropertyId()))
                .filter(u -> scope == null || (u.getPropertyId() != null && scope.contains(u.getPropertyId())))
                .map(u -> u.getContractorCompanyId())
                .collect(Collectors.toSet());
    }

    private void createMaintenanceCompanyUser(ContractorCompanyEntity company, ContractorCompanyRequestDTO dto, String email) {
        UserRequest userRequest = new UserRequest();
        userRequest.setEmail(email);
        userRequest.setUsername(email);
        userRequest.setFullName(firstNonBlank(company.getNameAr(), company.getNameEn(), company.getName()));
        userRequest.setFullNameAr(firstNonBlank(company.getNameAr(), company.getName()));
        userRequest.setFullNameEn(firstNonBlank(company.getNameEn(), company.getName()));
        userRequest.setPhone(company.getPhone());
        userRequest.setProfileImageUrl(company.getProfileImageUrl());
        userRequest.setCivilIdImageUrl(company.getCivilIdImageUrl());
        userRequest.setRole(UserRole.MAINTENANCE_COMPANY);
        userRequest.setPropertyId(dto.getPortalPropertyId());
        userRequest.setContractorCompanyId(company.getId());
        userService.create(userRequest);
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
