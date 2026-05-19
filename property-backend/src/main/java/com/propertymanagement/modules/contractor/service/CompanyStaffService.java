package com.propertymanagement.modules.contractor.service;

import com.propertymanagement.modules.contractor.dto.AllCompanyOfficerResponse;
import com.propertymanagement.modules.contractor.dto.CompanyOfficerCreateRequest;
import com.propertymanagement.modules.contractor.dto.CompanyOfficerResponse;
import com.propertymanagement.modules.contractor.dto.CompanyStaffPropertyResponse;
import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.service.UserService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyStaffService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final MaintenanceContractRepository maintenanceContractRepository;
    private final PropertyRepository propertyRepository;

    public List<CompanyOfficerResponse> listMyOfficers() {
        User company = requireCompanyUser();
        Long companyId = company.getContractorCompanyId();
        if (companyId == null) return List.of();
        return userRepository.findOfficersByContractorCompanyId(companyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<AllCompanyOfficerResponse> listAllOfficers() {
        return contractorCompanyRepository.findAll().stream()
                .flatMap(company -> userRepository.findOfficersByContractorCompanyId(company.getId())
                        .stream()
                        .map(u -> toAllResponse(u, company)))
                .toList();
    }

    public List<CompanyOfficerResponse> listCompanyOfficers(Long companyId) {
        if (companyId == null || !contractorCompanyRepository.existsById(companyId)) {
            throw AppException.notFound("Contractor company not found: " + companyId);
        }
        return userRepository.findOfficersByContractorCompanyId(companyId)
                .stream().map(this::toResponse).toList();
    }

    public List<CompanyStaffPropertyResponse> listMyAssignableProperties() {
        User company = requireCompanyUser();
        return activeCompanyProperties(company.getContractorCompanyId());
    }

    @Transactional
    public CompanyOfficerResponse createOfficer(CompanyOfficerCreateRequest request) {
        User company = requireCompanyUser();
        Long companyId = company.getContractorCompanyId();
        if (companyId == null) {
            throw AppException.badRequest("Your account is not linked to a contractor company");
        }

        UserRequest userRequest = new UserRequest();
        userRequest.setEmail(request.getEmail().trim().toLowerCase());
        userRequest.setUsername(request.getEmail().trim().toLowerCase());
        userRequest.setFullName(request.getFullName());
        userRequest.setFullNameAr(request.getFullNameAr());
        userRequest.setFullNameEn(request.getFullNameEn());
        userRequest.setPhone(request.getPhone());
        userRequest.setProfileImageUrl(request.getProfileImageUrl());
        userRequest.setCivilIdImageUrl(request.getCivilIdImageUrl());
        userRequest.setRole(UserRole.MAINTENANCE_OFFICER_COMPANY);
        userRequest.setMaintenanceOfficerType(MaintenanceOfficerType.CONTRACTOR_COMPANY);
        userRequest.setContractorCompanyId(companyId);
        userRequest.setPropertyId(resolveOfficerPropertyId(request, company));

        userService.create(userRequest);

        return userRepository.findByEmailIgnoreCase(userRequest.getEmail())
                .map(user -> {
                    syncEmployeeJobTitle(user);
                    return toResponse(user);
                })
                .orElseThrow(() -> AppException.badRequest("Officer created but could not be retrieved"));
    }

    @Transactional
    public CompanyOfficerResponse updateOfficer(Long officerId, CompanyOfficerCreateRequest request) {
        User company = requireCompanyUser();
        User officer = requireMyOfficer(officerId, company.getContractorCompanyId());
        String email = request.getEmail().trim().toLowerCase();
        userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
            if (!Objects.equals(existing.getId(), officerId)) {
                throw AppException.conflict("Email already in use: " + email, "EMAIL_ALREADY_USED");
            }
        });

        officer.setEmail(email);
        officer.setUsername(email);
        officer.setFullName(request.getFullName());
        officer.setFullNameAr(firstNonBlank(request.getFullNameAr(), request.getFullName()));
        officer.setFullNameEn(firstNonBlank(request.getFullNameEn(), request.getFullName()));
        officer.setPhone(request.getPhone());
        officer.setProfileImageUrl(request.getProfileImageUrl());
        officer.setCivilIdImageUrl(request.getCivilIdImageUrl());
        if (request.getPropertyId() != null) {
            officer.setPropertyId(resolveOfficerPropertyId(request, company));
        }

        User saved = userRepository.save(officer);
        employeeRepository.findByLinkedUserId(saved.getId()).ifPresent(employee -> {
            employee.setFullName(saved.getFullName());
            employee.setFullNameAr(saved.getFullNameAr());
            employee.setFullNameEn(saved.getFullNameEn());
            employee.setEmail(saved.getEmail());
            employee.setPhone(saved.getPhone());
            employee.setProfileImageUrl(saved.getProfileImageUrl());
            employee.setCivilIdImageUrl(saved.getCivilIdImageUrl());
            employee.setJobTitleAr(contractorOfficerTitle(saved, true));
            employee.setJobTitleEn(contractorOfficerTitle(saved, false));
            employeeRepository.save(employee);
        });
        return toResponse(saved);
    }

    @Transactional
    public CompanyOfficerResponse toggleActive(Long officerId) {
        User company = requireCompanyUser();
        User officer = requireMyOfficer(officerId, company.getContractorCompanyId());
        officer.setActive(!officer.isActive());
        return toResponse(userRepository.save(officer));
    }

    @Transactional
    public void removeOfficer(Long officerId, Long replacementOfficerId) {
        User company = requireCompanyUser();
        User officer = requireMyOfficer(officerId, company.getContractorCompanyId());
        long assignedRequests = maintenanceRequestRepository.countByAssignedTo(officerId);
        if (assignedRequests > 0) {
            if (replacementOfficerId == null) {
                throw AppException.badRequest(
                        "Cannot delete this officer because they have assigned maintenance requests. Transfer them to another officer first.",
                        "STAFF_REASSIGN_REQUIRED");
            }
            User replacement = requireMyOfficer(replacementOfficerId, company.getContractorCompanyId());
            if (Objects.equals(officerId, replacementOfficerId)) {
                throw AppException.badRequest("Replacement officer must be different", "INVALID_REPLACEMENT_OFFICER");
            }
            if (!replacement.isActive()) {
                throw AppException.badRequest("Replacement officer must be active", "INVALID_REPLACEMENT_OFFICER");
            }
            maintenanceRequestRepository.reassignOfficer(officerId, replacementOfficerId);
        }

        employeeRepository.findByLinkedUserId(officer.getId()).ifPresent(employee -> {
            employee.setLinkedUserId(null);
            employee.setStatus("TERMINATED");
            employeeRepository.save(employee);
        });
        userRepository.delete(officer);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private User requireCompanyUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            if (user.getRole() != UserRole.MAINTENANCE_COMPANY) {
                throw AppException.forbidden("Only maintenance company portal accounts can manage staff");
            }
            return user;
        }
        throw AppException.forbidden("Not authenticated");
    }

    private User requireMyOfficer(Long officerId, Long companyId) {
        User officer = userRepository.findById(officerId)
                .orElseThrow(() -> AppException.notFound("Officer not found"));
        if (officer.getRole() != UserRole.MAINTENANCE_OFFICER_COMPANY
                || !Objects.equals(officer.getContractorCompanyId(), companyId)) {
            throw AppException.forbidden("This officer does not belong to your company");
        }
        return officer;
    }

    private static String firstNonBlank(String value, String fallback) {
        return value != null && !value.isBlank() ? value.trim() : fallback;
    }

    private void syncEmployeeJobTitle(User officer) {
        employeeRepository.findByLinkedUserId(officer.getId()).ifPresent(employee -> {
            employee.setJobTitleAr(contractorOfficerTitle(officer, true));
            employee.setJobTitleEn(contractorOfficerTitle(officer, false));
            employeeRepository.save(employee);
        });
    }

    private String contractorOfficerTitle(User officer, boolean arabic) {
        String base = arabic ? "موظف تابع لشركة الصيانة" : "Maintenance company officer";
        String companyName = officer.getContractorCompanyId() == null
                ? null
                : contractorCompanyRepository.findById(officer.getContractorCompanyId())
                        .map(this::companyDisplayName)
                        .orElse(null);
        return companyName == null || companyName.isBlank() ? base : base + " - " + companyName.trim();
    }

    private String companyDisplayName(ContractorCompanyEntity company) {
        return firstNonBlank(company.getNameAr(), firstNonBlank(company.getNameEn(), company.getName()));
    }

    private AllCompanyOfficerResponse toAllResponse(User u, ContractorCompanyEntity company) {
        return new AllCompanyOfficerResponse(
                u.getId(),
                u.getFullName(),
                u.getFullNameAr(),
                u.getFullNameEn(),
                u.getEmail(),
                u.getPhone(),
                u.isActive(),
                u.getProfileImageUrl(),
                u.getPropertyId(),
                propertyName(u.getPropertyId(), true),
                propertyNameEn(u.getPropertyId()),
                company.getId(),
                firstNonBlank(company.getNameAr(), firstNonBlank(company.getNameEn(), company.getName())),
                firstNonBlank(company.getNameEn(), firstNonBlank(company.getName(), company.getNameAr()))
        );
    }

    private CompanyOfficerResponse toResponse(User u) {
        return new CompanyOfficerResponse(
                u.getId(),
                u.getFullName(),
                u.getFullNameAr(),
                u.getFullNameEn(),
                u.getEmail(),
                u.getPhone(),
                u.isActive(),
                u.getProfileImageUrl(),
                u.getCivilIdImageUrl(),
                u.getPropertyId(),
                propertyName(u.getPropertyId(), false),
                propertyName(u.getPropertyId(), true),
                propertyNameEn(u.getPropertyId())
        );
    }

    private Long resolveOfficerPropertyId(CompanyOfficerCreateRequest request, User company) {
        List<CompanyStaffPropertyResponse> activeProperties = activeCompanyProperties(company.getContractorCompanyId());
        if (request.getPropertyId() != null) {
            boolean allowed = activeProperties.stream().anyMatch(p -> Objects.equals(p.propertyId(), request.getPropertyId()));
            if (!allowed) {
                throw AppException.badRequest("Selected property is not linked to an active maintenance contract for your company", "INVALID_STAFF_PROPERTY");
            }
            return request.getPropertyId();
        }
        if (activeProperties.size() == 1) {
            return activeProperties.get(0).propertyId();
        }
        if (activeProperties.size() > 1) {
            throw AppException.badRequest("Property is required because your company has active contracts on multiple properties", "STAFF_PROPERTY_REQUIRED");
        }
        return company.getPropertyId();
    }

    private List<CompanyStaffPropertyResponse> activeCompanyProperties(Long companyId) {
        if (companyId == null) {
            return List.of();
        }
        Map<Long, CompanyStaffPropertyResponse> byProperty = new LinkedHashMap<>();
        for (MaintenanceContract contract : maintenanceContractRepository.findActiveOngoingByContractor(companyId, LocalDate.now())) {
            if (contract.getPropertyId() == null || byProperty.containsKey(contract.getPropertyId())) {
                continue;
            }
            Property property = propertyRepository.findById(contract.getPropertyId()).orElse(null);
            byProperty.put(contract.getPropertyId(), new CompanyStaffPropertyResponse(
                    contract.getPropertyId(),
                    property != null ? property.getPropertyName() : null,
                    property != null ? property.getPropertyNameAr() : null,
                    property != null ? property.getPropertyNameEn() : null,
                    contract.getContractNumber()
            ));
        }
        return List.copyOf(byProperty.values());
    }

    private String propertyName(Long propertyId, boolean arabic) {
        if (propertyId == null) {
            return null;
        }
        return propertyRepository.findById(propertyId)
                .map(p -> arabic
                        ? firstNonBlank(p.getPropertyNameAr(), firstNonBlank(p.getPropertyNameEn(), p.getPropertyName()))
                        : firstNonBlank(p.getPropertyName(), firstNonBlank(p.getPropertyNameEn(), p.getPropertyNameAr())))
                .orElse(null);
    }

    private String propertyNameEn(Long propertyId) {
        if (propertyId == null) {
            return null;
        }
        return propertyRepository.findById(propertyId)
                .map(p -> firstNonBlank(p.getPropertyNameEn(), firstNonBlank(p.getPropertyName(), p.getPropertyNameAr())))
                .orElse(null);
    }
}
