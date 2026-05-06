package com.propertymanagement.modules.auth;

import com.propertymanagement.modules.auth.dto.LoginRequest;
import com.propertymanagement.modules.auth.dto.LoginResponse;
import com.propertymanagement.modules.auth.dto.RefreshTokenRequest;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.moduleconfig.PropertyModuleSettingService;
import com.propertymanagement.modules.permission.RolePermissionService;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.user.PortalProfileBridge;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.AppMessages;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import com.propertymanagement.shared.security.JwtUtil;
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

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw AppException.badRequest(appMessages.get("auth.error.credentials_required"));
        }
        String rawEmail = request.getEmail().trim();
        User resolved = userRepository.findByEmail(rawEmail)
                .or(() -> userRepository.findByEmailIgnoreCase(rawEmail))
                .orElseThrow(() -> AppException.badRequest(appMessages.get("auth.error.unknown_email")));
        if (!resolved.isActive()) {
            throw AppException.badRequest(appMessages.get("auth.error.account_inactive"));
        }
        try {
            // Use canonical email from DB so it matches UserDetailsServiceImpl lookup.
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(resolved.getEmail(), request.getPassword())
            );
            User user = (User) auth.getPrincipal();
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            return buildResponse(user);
        } catch (DisabledException e) {
            throw AppException.badRequest(appMessages.get("auth.error.account_inactive"));
        } catch (BadCredentialsException e) {
            throw AppException.badRequest(appMessages.get("auth.error.invalid_password"));
        } catch (AuthenticationException e) {
            throw AppException.badRequest(appMessages.get("auth.error.invalid_password"));
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
                "propertyId", user.getPropertyId() != null ? user.getPropertyId() : ""
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
                .fullNameAr(null)
                .fullNameEn(null)
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
                        com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponse::getModuleKey,
                        com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponse::isEnabled,
                        (a, b) -> b,
                        java.util.LinkedHashMap::new
                ));
    }
}
