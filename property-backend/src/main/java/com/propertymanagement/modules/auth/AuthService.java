package com.propertymanagement.modules.auth;

import com.propertymanagement.modules.auth.dto.LoginRequest;
import com.propertymanagement.modules.auth.dto.LoginResponse;
import com.propertymanagement.modules.auth.dto.RefreshTokenRequest;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            User user = (User) auth.getPrincipal();
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            return buildResponse(user);
        } catch (BadCredentialsException e) {
            throw AppException.badRequest("Invalid email or password");
        }
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        if (!jwtUtil.isValid(token)) {
            throw AppException.badRequest("Refresh token is invalid or expired");
        }
        String email = jwtUtil.extractSubject(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> AppException.notFound("User not found"));
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
        if (user.getRole() == UserRole.TENANT) {
            tenantId = tenantRepository.findByUserId(user.getId())
                    .map(t -> t.getId())
                    .orElse(null);
        }

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration / 1000)
                .user(LoginResponse.UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .username(user.getUsername())
                        .fullName(user.getFullName())
                        .profileImageUrl(user.getProfileImageUrl())
                        .bio(user.getBio())
                        .role(user.getRole().name())
                        .propertyId(user.getPropertyId())
                        .maintenanceOfficerType(user.getMaintenanceOfficerType() != null ? user.getMaintenanceOfficerType().name() : null)
                        .maintenanceCompanyName(user.getMaintenanceCompanyName())
                        .tenantId(tenantId)
                        .build())
                .build();
    }
}
