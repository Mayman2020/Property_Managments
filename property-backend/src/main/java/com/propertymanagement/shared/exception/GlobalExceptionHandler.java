package com.propertymanagement.shared.exception;

import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.stream.Collectors;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.user.entity.User;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    private String tr(String code, WebRequest request) {
        return messageSource.getMessage(code, null, code, request.getLocale());
    }

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        // Log with ASCII-safe format to avoid Windows console encoding issues
        log.warn("AppException [{}] code={} msg-length={}", ex.getStatus(), ex.getErrorCode(), ex.getMessage().length());
        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error(message, "VALIDATION_ERROR"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuth(AuthenticationException ex, WebRequest request) {
        log.warn("AuthenticationException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(tr("error.unauthorized", request), "UNAUTHORIZED"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(tr("error.access_denied", request), "FORBIDDEN"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex, WebRequest request) {
        String detail = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (detail != null) {
            if (detail.contains("tenants_email_key")) {
                log.warn("DataIntegrityViolation (tenant email): {}", detail);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error(tr("error.email_tenant_conflict", request), "EMAIL_ALREADY_USED"));
            }
            if (detail.contains("users") && detail.contains("email")) {
                log.warn("DataIntegrityViolation (user email): {}", detail);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error(tr("error.email_user_conflict", request), "EMAIL_ALREADY_USED"));
            }
        }
        log.error("Data integrity violation", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(tr("error.internal", request), "INTERNAL_ERROR"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex, WebRequest request) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(tr("error.internal", request), "INTERNAL_ERROR"));
    }
}
