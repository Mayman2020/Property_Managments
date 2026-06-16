package com.propertymanagement.modules.devops.controller;

import com.propertymanagement.shared.response.ApiResponse;
import com.propertymanagement.shared.security.LoginAttemptService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

/**
 * QA-only data helpers (no public business API). Restricted to SUPER_ADMIN.
 * Disabled entirely in the 'prod' Spring profile.
 */
@Profile("!prod")
@RestController
@RequestMapping("/dev/qa")
@RequiredArgsConstructor
public class DevQaController {

    @PersistenceContext
    private EntityManager entityManager;

    private final LoginAttemptService loginAttemptService;

    @PostMapping("/seed-budget")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedBudget(@RequestBody SeedBudgetRequest req) {
        if (req.getPropertyId() == null || req.getCategoryId() == null || req.getBudgetedAmount() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("propertyId, categoryId, budgetedAmount required", "VALIDATION_ERROR"));
        }
        entityManager.createNativeQuery("""
                INSERT INTO financial_periods (property_id, period_name, period_type, start_date, end_date, status)
                SELECT :propertyId, 'QA-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'MONTHLY',
                       CAST(date_trunc('month', CURRENT_DATE) AS date),
                       CAST(date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day' AS date), 'OPEN'
                WHERE NOT EXISTS (
                    SELECT 1 FROM budgets b
                    JOIN financial_periods fp ON fp.id = b.financial_period_id
                    WHERE b.property_id = :propertyId AND b.category_id = :categoryId
                      AND fp.start_date = CAST(date_trunc('month', CURRENT_DATE) AS date)
                )
                """)
                .setParameter("propertyId", req.getPropertyId())
                .setParameter("categoryId", req.getCategoryId())
                .executeUpdate();

        entityManager.createNativeQuery("""
                INSERT INTO budgets (property_id, financial_period_id, category_id, budgeted_amount)
                VALUES (
                    :propertyId,
                    (SELECT id FROM financial_periods
                     WHERE property_id = :propertyId
                       AND start_date = CAST(date_trunc('month', CURRENT_DATE) AS date)
                     ORDER BY id DESC LIMIT 1),
                    :categoryId,
                    :budgetedAmount
                )
                ON CONFLICT (property_id, financial_period_id, category_id)
                DO UPDATE SET budgeted_amount = EXCLUDED.budgeted_amount
                """)
                .setParameter("propertyId", req.getPropertyId())
                .setParameter("categoryId", req.getCategoryId())
                .setParameter("budgetedAmount", req.getBudgetedAmount())
                .executeUpdate();

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "propertyId", req.getPropertyId(),
                "categoryId", req.getCategoryId(),
                "budgetedAmount", req.getBudgetedAmount())));
    }

    @PostMapping("/contracts/{contractId}/force-end-date-past")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> forceContractEndDatePast(@PathVariable Long contractId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE lease_contracts
                SET end_date = CURRENT_DATE - INTERVAL '30 days',
                    updated_at = NOW()
                WHERE id = :contractId
                """)
                .setParameter("contractId", contractId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("contractId", contractId, "updated", updated)));
    }

    @PostMapping("/contracts/{contractId}/seed-expiring-soon")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedContractExpiringSoon(@PathVariable Long contractId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE lease_contracts
                SET end_date = CURRENT_DATE + INTERVAL '3 days',
                    status = 'ACTIVE',
                    updated_at = NOW()
                WHERE id = :contractId
                """)
                .setParameter("contractId", contractId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("contractId", contractId, "updated", updated)));
    }

    @PostMapping("/contracts/{contractId}/seed-rent-due")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedRentDue(@PathVariable Long contractId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE rent_payment_schedule
                SET due_date = CURRENT_DATE + INTERVAL '3 days',
                    status = 'PENDING'
                WHERE id = (
                    SELECT id FROM rent_payment_schedule
                    WHERE contract_id = :contractId AND status = 'PENDING'
                    ORDER BY due_date ASC
                    LIMIT 1
                )
                """)
                .setParameter("contractId", contractId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("contractId", contractId, "schedulesUpdated", updated)));
    }

    @PostMapping("/contracts/{contractId}/seed-rent-overdue")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedRentOverdue(@PathVariable Long contractId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE rent_payment_schedule
                SET due_date = CURRENT_DATE - INTERVAL '1 day',
                    status = 'PENDING'
                WHERE id = (
                    SELECT id FROM rent_payment_schedule
                    WHERE contract_id = :contractId AND status IN ('PENDING', 'OVERDUE')
                    ORDER BY due_date ASC
                    LIMIT 1
                )
                """)
                .setParameter("contractId", contractId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("contractId", contractId, "schedulesUpdated", updated)));
    }

    @PostMapping("/properties/{propertyId}/seed-document-expiry")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedDocumentExpiry(@PathVariable Long propertyId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE property_attachments
                SET expiry_date = CURRENT_DATE + INTERVAL '14 days'
                WHERE id = (
                    SELECT id FROM property_attachments
                    WHERE property_id = :propertyId
                    ORDER BY id ASC
                    LIMIT 1
                )
                """)
                .setParameter("propertyId", propertyId)
                .executeUpdate();
        if (updated == 0) {
            entityManager.createNativeQuery("""
                    INSERT INTO property_attachments (property_id, original_name, stored_name, file_path, mime_type, expiry_date)
                    VALUES (:propertyId, 'QA Expiry Doc', 'qa-expiry-' || to_char(now(), 'FM99999999') || '.pdf',
                            '/qa/placeholder.pdf', 'application/pdf', CURRENT_DATE + INTERVAL '14 days')
                    """)
                    .setParameter("propertyId", propertyId)
                    .executeUpdate();
            updated = 1;
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("propertyId", propertyId, "attachmentsUpdated", updated)));
    }

    @PostMapping("/properties/{propertyId}/seed-low-stock")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedLowStock(@PathVariable Long propertyId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE inventory_items
                SET quantity = GREATEST(0, COALESCE(min_quantity, 1) - 1),
                    min_quantity = GREATEST(COALESCE(min_quantity, 5), 5),
                    is_active = TRUE,
                    updated_at = NOW()
                WHERE id = (
                    SELECT id FROM inventory_items
                    WHERE property_id = :propertyId AND is_active = TRUE
                    ORDER BY id ASC
                    LIMIT 1
                )
                """)
                .setParameter("propertyId", propertyId)
                .executeUpdate();
        if (updated == 0) {
            entityManager.createNativeQuery("""
                    INSERT INTO inventory_items (property_id, item_code, item_name_ar, item_name_en,
                        unit_of_measure, quantity, min_quantity, location, is_active)
                    VALUES (:propertyId, 'QA-LOW-' || to_char(now(), 'FM99999999'), 'صنف QA', 'QA Item',
                        'EA', 0, 5, 'QA', TRUE)
                    """)
                    .setParameter("propertyId", propertyId)
                    .executeUpdate();
            updated = 1;
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("propertyId", propertyId, "itemsUpdated", updated)));
    }

    @PostMapping("/employees/{employeeId}/seed-leave-balance-low")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedLeaveBalanceLow(@PathVariable Long employeeId) {
        int year = java.time.Year.now().getValue();
        int deleted = entityManager.createNativeQuery("""
                DELETE FROM leave_requests
                WHERE employee_id = :employeeId AND EXTRACT(YEAR FROM start_date) = :year
                """)
                .setParameter("employeeId", employeeId)
                .setParameter("year", year)
                .executeUpdate();
        int inserted = entityManager.createNativeQuery("""
                INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_count, status, reason)
                VALUES (:employeeId, 1, CURRENT_DATE - INTERVAL '60 days',
                        CURRENT_DATE - INTERVAL '54 days', 26, 'APPROVED', 'QA leave balance low seed')
                """)
                .setParameter("employeeId", employeeId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "employeeId", employeeId,
                "clearedRequests", deleted,
                "seededRequests", inserted)));
    }

    @PostMapping("/users/{userId}/seed-new-login-ip")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedNewLoginIp(@PathVariable Long userId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE users
                SET last_login_ip = '192.168.99.1',
                    last_login = NOW() - INTERVAL '1 day',
                    updated_at = NOW()
                WHERE id = :userId
                """)
                .setParameter("userId", userId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("userId", userId, "updated", updated)));
    }

    @PostMapping("/users/clear-password-change-required")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearPasswordChangeRequired(
            @RequestBody ClearLoginLockRequest req) {
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("email required", "VALIDATION_ERROR"));
        }
        int updated = entityManager.createNativeQuery("""
                UPDATE users
                SET must_change_password = FALSE, updated_at = NOW()
                WHERE LOWER(email) = LOWER(:email)
                """)
                .setParameter("email", req.getEmail().trim())
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("email", req.getEmail(), "updated", updated)));
    }

    @PostMapping("/users/clear-login-lock")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearLoginLock(@RequestBody ClearLoginLockRequest req) {
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("email required", "VALIDATION_ERROR"));
        }
        loginAttemptService.recordSuccess(req.getEmail().trim());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("email", req.getEmail(), "cleared", true)));
    }

    @PostMapping("/users/{userId}/assign-property")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> assignUserProperty(
            @PathVariable Long userId,
            @RequestBody AssignPropertyRequest req) {
        if (req.getPropertyId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("propertyId required", "VALIDATION_ERROR"));
        }
        int updated = entityManager.createNativeQuery("""
                UPDATE users SET property_id = :propertyId, updated_at = NOW() WHERE id = :userId
                """)
                .setParameter("userId", userId)
                .setParameter("propertyId", req.getPropertyId())
                .executeUpdate();
        entityManager.createNativeQuery("""
                INSERT INTO user_property_access (user_id, property_id)
                VALUES (:userId, :propertyId)
                ON CONFLICT (user_id, property_id) DO NOTHING
                """)
                .setParameter("userId", userId)
                .setParameter("propertyId", req.getPropertyId())
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("userId", userId, "propertyId", req.getPropertyId(), "updated", updated)));
    }

    @PostMapping("/contracts/{contractId}/seed-rent-grace-escalation")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedRentGraceEscalation(@PathVariable Long contractId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE rent_payment_schedule
                SET due_date = CURRENT_DATE - INTERVAL '10 days',
                    status = 'OVERDUE'
                WHERE id = (
                    SELECT id FROM rent_payment_schedule
                    WHERE contract_id = :contractId
                    ORDER BY due_date ASC
                    LIMIT 1
                )
                """)
                .setParameter("contractId", contractId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("contractId", contractId, "schedulesUpdated", updated)));
    }

    /**
     * Aligns pending installments for scheduler QA: one due in 3 days, one due today.
     */
    @PostMapping("/maintenance-invoices/{invoiceId}/seed-payment-due")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedMaintenanceInvoicePaymentDue(
            @PathVariable Long invoiceId) {
        Number pendingCount = (Number) entityManager.createNativeQuery("""
                SELECT COUNT(*) FROM maintenance_contract_invoice_payments
                WHERE invoice_id = :invoiceId AND status = 'PENDING'
                """)
                .setParameter("invoiceId", invoiceId)
                .getSingleResult();
        long pending = pendingCount == null ? 0L : pendingCount.longValue();

        int soon = entityManager.createNativeQuery("""
                UPDATE maintenance_contract_invoice_payments
                SET due_date = CURRENT_DATE + INTERVAL '3 days',
                    status = 'PENDING',
                    reminder_3d_sent_at = NULL,
                    due_today_sent_at = NULL,
                    updated_at = NOW()
                WHERE invoice_id = :invoiceId
                  AND installment_no = (
                      SELECT MIN(installment_no) FROM maintenance_contract_invoice_payments
                      WHERE invoice_id = :invoiceId AND status = 'PENDING'
                  )
                """)
                .setParameter("invoiceId", invoiceId)
                .executeUpdate();

        int today = 0;
        if (pending >= 2) {
            today = entityManager.createNativeQuery("""
                    UPDATE maintenance_contract_invoice_payments
                    SET due_date = CURRENT_DATE,
                        status = 'PENDING',
                        reminder_3d_sent_at = NULL,
                        due_today_sent_at = NULL,
                        updated_at = NOW()
                    WHERE invoice_id = :invoiceId
                      AND installment_no = (
                          SELECT MAX(installment_no) FROM maintenance_contract_invoice_payments
                          WHERE invoice_id = :invoiceId AND status = 'PENDING'
                      )
                    """)
                    .setParameter("invoiceId", invoiceId)
                    .executeUpdate();
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "invoiceId", invoiceId,
                "pendingCount", pending,
                "dueSoonUpdated", soon,
                "dueTodayUpdated", today)));
    }

    @PostMapping("/units/{unitId}/unpublish-vacancy")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> unpublishVacancy(@PathVariable Long unitId) {
        int updated = entityManager.createNativeQuery("""
                UPDATE vacancy_listings
                SET is_published = FALSE, updated_at = NOW()
                WHERE unit_id = :unitId AND is_published = TRUE
                """)
                .setParameter("unitId", unitId)
                .executeUpdate();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unitId", unitId, "unpublished", updated)));
    }

    public static class SeedBudgetRequest {
        private Long propertyId;
        private Long categoryId;
        private BigDecimal budgetedAmount;

        public Long getPropertyId() { return propertyId; }
        public void setPropertyId(Long propertyId) { this.propertyId = propertyId; }
        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
        public BigDecimal getBudgetedAmount() { return budgetedAmount; }
        public void setBudgetedAmount(BigDecimal budgetedAmount) { this.budgetedAmount = budgetedAmount; }
    }

    public static class ClearLoginLockRequest {
        private String email;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class AssignPropertyRequest {
        private Long propertyId;
        public Long getPropertyId() { return propertyId; }
        public void setPropertyId(Long propertyId) { this.propertyId = propertyId; }
    }
}
