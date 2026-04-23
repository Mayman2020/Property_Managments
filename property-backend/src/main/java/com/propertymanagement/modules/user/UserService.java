package com.propertymanagement.modules.user;

import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.dto.UserProfileUpdateRequest;
import com.propertymanagement.modules.user.dto.ChangePasswordRequest;
import com.propertymanagement.modules.user.dto.UserRoleUpdateRequest;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
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
                .active(true)
                .build();
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
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
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
            String companyName = request.getMaintenanceCompanyName();
            if (companyName == null || companyName.isBlank()) {
                throw AppException.badRequest("Contractor company name is required for external maintenance officers");
            }
        }
    }

    private void normalizeRoleSpecificFields(User user) {
        if (user.getRole() != UserRole.MAINTENANCE_OFFICER) {
            user.setMaintenanceOfficerType(null);
            user.setMaintenanceCompanyName(null);
            return;
        }
        if (user.getMaintenanceOfficerType() != MaintenanceOfficerType.CONTRACTOR_COMPANY) {
            user.setMaintenanceCompanyName(null);
        }
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
