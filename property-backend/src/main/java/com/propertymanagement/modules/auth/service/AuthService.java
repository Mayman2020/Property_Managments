package com.propertymanagement.modules.auth.service;

import com.propertymanagement.modules.auth.dto.LoginRequest;
import com.propertymanagement.modules.auth.dto.LoginResponse;
import com.propertymanagement.modules.auth.dto.RefreshTokenRequest;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.moduleconfig.service.PropertyModuleSettingService;
import com.propertymanagement.modules.permission.service.RolePermissionService;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.user.service.PortalProfileBridge;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import com.propertymanagement.shared.security.JwtUtil;
import com.propertymanagement.shared.security.LoginAttemptService;
import com.propertymanagement.shared.security.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppMessages appMessages;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final OwnerRepository ownerRepository;
    private final RolePermissionService rolePermissionService;
    private final PropertyModuleSettingService propertyModuleSettingService;
    private final PortalProfileBridge portalProfileBridge;
    private final LoginAttemptService loginAttemptService;
    private final TokenBlacklistService tokenBlacklist;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw AppException.badRequest(appMessages.get("auth.error.credentials_required"));
        }
        String rawEmail = request.getEmail().trim();
        if (loginAttemptService.isLocked(rawEmail)) {
            throw AppException.badRequest("Account temporarily locked due to too many failed attempts. Try again later.");
        }
        User resolved = userRepository.findByEmail(rawEmail)
                .or(() -> userRepository.findByEmailIgnoreCase(rawEmail))
                .orElseThrow(() -> {
                    loginAttemptService.recordFailure(rawEmail);
                    return AppException.badRequest(appMessages.get("auth.error.invalid_password"));
                });
        if (!resolved.isActive()) {
            throw AppException.badRequest(appMessages.get("auth.error.account_inactive"));
        }
        try {
            // Use canonical email from DB so it matches UserDetailsServiceImpl LookupEntity.
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(resolved.getEmail(), request.getPassword())
            );
            User user = (User) auth.getPrincipal();
            loginAttemptService.recordSuccess(rawEmail);
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            return buildResponse(user);
        } catch (DisabledException e) {
            throw AppException.badRequest(appMessages.get("auth.error.account_inactive"));
        } catch (BadCredentialsException e) {
            loginAttemptService.recordFailure(rawEmail);
            throw AppException.badRequest(appMessages.get("auth.error.invalid_password"));
        } catch (AuthenticationException e) {
            loginAttemptService.recordFailure(rawEmail);
            throw AppException.badRequest(appMessages.get("auth.error.invalid_password"));
        }
    }

    public void logout(String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7);
            if (jwtUtil.isValid(token)) {
                Instant expiry = jwtUtil.extractExpiration(token).toInstant();
                tokenBlacklist.revoke(token, expiry);
            }
        }
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        if (!jwtUtil.isValid(token)) {
            throw AppException.badRequest(appMessages.get("auth.refresh.invalid"));
        }
        String email = jwtUtil.extractSubject(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> AppException.notFound(appMessages.get("auth.refresh.user_not_found")));
        if (!user.isActive()) {
            throw AppException.badRequest(appMessages.get("auth.refresh.account_inactive"));
        }
        return buildResponse(user);
    }

    private LoginResponse buildResponse(User user) {
        Map<String, Object> claims = Map.of(
                "role", user.getRole().name(),
                "userId", user.getId(),
                "propertyId", user.getPropertyId() != null ? user.getPropertyId() : "",
                "mustChangePassword", user.isMustChangePassword()
        );
        String accessToken = jwtUtil.generateToken(user.getEmail(), claims);
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        Long tenantId = null;
        Long ownerId = null;
        if (user.getRole() == UserRole.TENANT) {
            tenantId = tenantRepository.findByUserId(user.getId())
                    .map(t -> t.getId())
                    .orElse(null);
        } else if (user.getRole() == UserRole.OWNER) {
            ownerId = ownerRepository.findByUserId(user.getId())
                    .map(o -> o.getId())
                    .orElse(null);
        }

        List<Map<String, Map<String, Boolean>>> permMaps = new ArrayList<>();
        for (UserRole r : user.getAllAssignedRoles()) {
            permMaps.add(rolePermissionService.getPermissionMap(r));
        }
        List<String> extraRoleNames = user.getExtraRolesList().stream().map(Enum::name).toList();

        LoginResponse.UserDto userDto = LoginResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .fullNameAr(user.getFullNameAr())
                .fullNameEn(user.getFullNameEn())
                .profileImageUrl(user.getProfileImageUrl())
                .bio(user.getBio())
                .role(user.getRole().name())
                .extraRoles(extraRoleNames)
                .propertyId(user.getPropertyId())
                .maintenanceOfficerType(user.getMaintenanceOfficerType() != null ? user.getMaintenanceOfficerType().name() : null)
                .maintenanceCompanyName(user.getMaintenanceCompanyName())
                .contractorCompanyId(user.getContractorCompanyId())
                .tenantId(tenantId)
                .ownerId(ownerId)
                .civilIdImageUrl(null)
                .leaseContractFiles(null)
                .permissions(RolePermissionService.mergePermissionMaps(permMaps))
                .clientModules(resolveClientModules(user))
                .mustChangePassword(user.isMustChangePassword())
                .build();
        userDto = portalProfileBridge.mergeRoleRecordIntoLoginUser(userDto, user);
        userDto.setFullName(LocalizedNameResolver.resolve(
                userDto.getFullNameAr(),
                userDto.getFullNameEn(),
                userDto.getFullName()));

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration / 1000)
                .user(userDto)
                .build();
    }

    private Map<String, Boolean> resolveClientModules(User user) {
        if (user.getPropertyId() == null || user.getRole() == UserRole.SUPER_ADMIN) {
            return java.util.Collections.emptyMap();
        }
        return propertyModuleSettingService.getSettingsSnapshot(user.getPropertyId()).stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponseDTO::getModuleKey,
                        com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponseDTO::isEnabled,
                        (a, b) -> b,
                        java.util.LinkedHashMap::new
                ));
    }
}
