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
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.format.DateTimeParseException;
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
            if (detail.contains("employees_national_id_key")) {
                log.warn("DataIntegrityViolation (employee national_id): {}", detail);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error(tr("error.national_id_conflict", request), "NATIONAL_ID_ALREADY_USED"));
            }
            if (detail.contains("employees") && detail.contains("email")) {
                log.warn("DataIntegrityViolation (employee email): {}", detail);
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error(tr("error.email_employee_conflict", request), "EMAIL_ALREADY_USED"));
            }
        }
        log.error("Data integrity violation", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(tr("error.internal", request), "INTERNAL_ERROR"));
    }

    @ExceptionHandler({ NoHandlerFoundException.class, NoResourceFoundException.class })
    public ResponseEntity<ApiResponse<Void>> handleNotFound(Exception ex, WebRequest request) {
        // Spring Boot 3.2 throws NoResourceFoundException for unmapped URLs; older
        // releases throw NoHandlerFoundException. Both must surface as 404 rather
        // than getting swallowed by the catch-all handleGeneral → 500 below.
        log.warn("No handler for request: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(tr("error.not_found", request), "NOT_FOUND"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex,
                                                                    WebRequest request) {
        log.warn("Method not allowed: {} {}", ex.getMethod(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.error(tr("error.method_not_allowed", request), "METHOD_NOT_ALLOWED"));
    }

    @ExceptionHandler(DateTimeParseException.class)
    public ResponseEntity<ApiResponse<Void>> handleDateParse(DateTimeParseException ex, WebRequest request) {
        log.warn("Bad date format: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(tr("error.invalid_date_format", request), "INVALID_DATE_FORMAT"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex, WebRequest request) {
        log.warn("Type mismatch on parameter {}: {}", ex.getName(), ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(tr("error.invalid_parameter", request), "INVALID_PARAMETER"));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParam(MissingServletRequestParameterException ex, WebRequest request) {
        log.warn("Missing request parameter: {}", ex.getParameterName());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(tr("error.missing_parameter", request), "MISSING_PARAMETER"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleJsonParse(HttpMessageNotReadableException ex, WebRequest request) {
        log.warn("Unreadable HTTP message body: {}", ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(tr("error.invalid_request_body", request), "INVALID_REQUEST_BODY"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex, WebRequest request) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(tr("error.internal", request), "INTERNAL_ERROR"));
    }
}
