package com.propertymanagement.modules.user;

import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.dto.UserProfileUpdateRequest;
import com.propertymanagement.modules.user.dto.ChangePasswordRequest;
import com.propertymanagement.modules.user.dto.UserRoleUpdateRequest;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.modules.contractor.ContractorCompany;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final PasswordEncoder passwordEncoder;

    public Page<UserResponse> getAll(Pageable pageable, String q, UserRole role) {
        return userRepository.search(trimToNull(q), role, pageable).map(this::toResponse);
    }

    public UserResponse getById(Long id) {
        return toResponse(find(id));
    }

    public UserResponse getMyProfile() {
        return toResponse(find(currentUserId()));
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("Email already in use: " + request.getEmail());
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw AppException.conflict("Username already in use: " + request.getUsername());
        }
        validateMaintenanceOfficerDetails(request);
        String rawPassword = request.getPassword() != null ? request.getPassword() : "Change@123";
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .profileImageUrl(request.getProfileImageUrl())
                .bio(request.getBio())
                .role(request.getRole())
                .propertyId(request.getPropertyId())
                .maintenanceOfficerType(request.getMaintenanceOfficerType())
                .maintenanceCompanyName(request.getMaintenanceCompanyName())
                .contractorCompanyId(request.getContractorCompanyId())
                .active(true)
                .build();
        syncContractorDisplayName(user);
        normalizeRoleSpecificFields(user);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        User user = find(id);
        validateMaintenanceOfficerDetails(request);
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setProfileImageUrl(request.getProfileImageUrl());
        user.setBio(request.getBio());
        user.setRole(request.getRole());
        user.setPropertyId(request.getPropertyId());
        user.setMaintenanceOfficerType(request.getMaintenanceOfficerType());
        user.setMaintenanceCompanyName(request.getMaintenanceCompanyName());
        user.setContractorCompanyId(request.getContractorCompanyId());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        syncContractorDisplayName(user);
        normalizeRoleSpecificFields(user);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse toggleActive(Long id) {
        User user = find(id);
        user.setActive(!user.isActive());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateRole(Long id, UserRoleUpdateRequest request) {
        User user = find(id);
        user.setRole(request.getRole());
        normalizeRoleSpecificFields(user);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateMyProfile(UserProfileUpdateRequest request) {
        User user = find(currentUserId());
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        user.setPhone(request.getPhone());
        user.setProfileImageUrl(request.getProfileImageUrl());
        user.setBio(request.getBio());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void changeMyPassword(ChangePasswordRequest request) {
        User user = find(currentUserId());
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw AppException.badRequest("Current password is incorrect");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw AppException.badRequest("New password and confirmation do not match");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw AppException.badRequest("New password must be different from current password");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private User find(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("User not found: " + id));
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phone(u.getPhone())
                .profileImageUrl(u.getProfileImageUrl())
                .bio(u.getBio())
                .role(u.getRole())
                .propertyId(u.getPropertyId())
                .maintenanceOfficerType(u.getMaintenanceOfficerType())
                .maintenanceCompanyName(u.getMaintenanceCompanyName())
                .contractorCompanyId(u.getContractorCompanyId())
                .active(u.isActive())
                .lastLogin(u.getLastLogin())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }

    private void validateMaintenanceOfficerDetails(UserRequest request) {
        if (request.getRole() != UserRole.MAINTENANCE_OFFICER) {
            return;
        }
        if (request.getMaintenanceOfficerType() == null) {
            throw AppException.badRequest("Maintenance officer type is required");
        }
        if (request.getMaintenanceOfficerType() == MaintenanceOfficerType.CONTRACTOR_COMPANY) {
            if (request.getContractorCompanyId() == null) {
                throw AppException.badRequest("contractorCompanyId is required for contractor maintenance officers");
            }
            if (!contractorCompanyRepository.existsById(request.getContractorCompanyId())) {
                throw AppException.badRequest("Contractor company not found: " + request.getContractorCompanyId());
            }
        }
    }

    public List<UserResponse> findAssignableContractorOfficers(Long propertyId, Long contractorCompanyId) {
        User caller = requireCallerUser();
        if (caller.getRole() == UserRole.MAINTENANCE_OFFICER) {
            if (caller.getContractorCompanyId() == null
                    || caller.getPropertyId() == null
                    || !caller.getContractorCompanyId().equals(contractorCompanyId)
                    || !caller.getPropertyId().equals(propertyId)) {
                throw AppException.forbidden("Access denied");
            }
        } else if (caller.getRole() != UserRole.SUPER_ADMIN && caller.getRole() != UserRole.PROPERTY_ADMIN) {
            throw AppException.forbidden("Access denied");
        }
        return userRepository
                .findAssignableContractorOfficers(
                        UserRole.MAINTENANCE_OFFICER, propertyId, contractorCompanyId, MaintenanceOfficerType.CONTRACTOR_COMPANY)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private void normalizeRoleSpecificFields(User user) {
        if (user.getRole() != UserRole.MAINTENANCE_OFFICER) {
            user.setMaintenanceOfficerType(null);
            user.setMaintenanceCompanyName(null);
            user.setContractorCompanyId(null);
            return;
        }
        if (user.getMaintenanceOfficerType() != MaintenanceOfficerType.CONTRACTOR_COMPANY) {
            user.setMaintenanceCompanyName(null);
            user.setContractorCompanyId(null);
        }
    }

    private void syncContractorDisplayName(User user) {
        if (user.getRole() != UserRole.MAINTENANCE_OFFICER
                || user.getMaintenanceOfficerType() != MaintenanceOfficerType.CONTRACTOR_COMPANY
                || user.getContractorCompanyId() == null) {
            return;
        }
        ContractorCompany cc = contractorCompanyRepository.findById(user.getContractorCompanyId()).orElse(null);
        if (cc != null) {
            String label = firstNonBlank(cc.getNameAr(), cc.getNameEn(), cc.getName());
            if (label != null) {
                user.setMaintenanceCompanyName(label);
            }
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private User requireCallerUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private Long currentUserId() {
        return requireCallerUser().getId();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
