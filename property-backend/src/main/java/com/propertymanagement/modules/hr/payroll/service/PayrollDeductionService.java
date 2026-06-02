package com.propertymanagement.modules.hr.payroll.service;

import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.payroll.dto.PayrollDeductionDecisionRequest;
import com.propertymanagement.modules.hr.payroll.dto.PayrollDeductionRequest;
import com.propertymanagement.modules.hr.payroll.dto.PayrollDeductionResponse;
import com.propertymanagement.modules.hr.payroll.entity.PayrollDeduction;
import com.propertymanagement.modules.hr.payroll.entity.PayrollDeductionStatus;
import com.propertymanagement.modules.hr.payroll.repository.PayrollDeductionRepository;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PayrollDeductionService {

    private final PayrollDeductionRepository repository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public Page<PayrollDeductionResponse> list(Pageable pageable, Long employeeId) {
        if (employeeId != null) {
            Employee employee = employee(employeeId);
            return repository.findByEmployeeIdInOrderByCreatedAtDesc(List.of(employee.getId()), pageable)
                    .map(item -> toResponse(item, employee));
        }
        User actor = currentUser();
        List<Employee> employees = employeeRepository.findAll();
        if (actor.getPropertyId() != null && actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.GENERAL_MANAGER) {
            employees = employees.stream()
                    .filter(item -> Objects.equals(item.getPropertyId(), actor.getPropertyId()))
                    .toList();
        }
        if (employees.isEmpty()) return Page.empty(pageable);
        Map<Long, Employee> byId = employees.stream().collect(java.util.stream.Collectors.toMap(Employee::getId, item -> item));
        return repository.findByEmployeeIdInOrderByCreatedAtDesc(byId.keySet(), pageable)
                .map(item -> toResponse(item, byId.get(item.getEmployeeId())));
    }

    @Transactional
    public PayrollDeductionResponse create(PayrollDeductionRequest request) {
        User actor = currentUser();
        requireHr(actor);
        Employee employee = employee(request.getEmployeeId());
        assertPropertyAccess(employee, actor);
        String reason = trim(request.getReason());
        String payrollMonth = request.getPayrollMonth().trim();
        if (repository.existsByEmployeeIdAndReasonIgnoreCaseAndPayrollMonth(employee.getId(), reason, payrollMonth)) {
            throw AppException.conflict("Deduction already exists for this employee, reason, and payroll month");
        }
        PayrollDeduction saved = repository.save(PayrollDeduction.builder()
                .employeeId(employee.getId())
                .amount(request.getAmount())
                .reason(reason)
                .deductionDate(request.getDeductionDate())
                .payrollMonth(payrollMonth)
                .status(PayrollDeductionStatus.DRAFT)
                .createdBy(actor.getId())
                .build());
        return toResponse(saved, employee);
    }

    @Transactional
    public PayrollDeductionResponse update(Long id, PayrollDeductionRequest request) {
        User actor = currentUser();
        requireHr(actor);
        PayrollDeduction deduction = repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Deduction not found: " + id));
        if (deduction.getStatus() != PayrollDeductionStatus.DRAFT) {
            throw AppException.badRequest("Only draft deductions can be edited");
        }
        Employee employee = employee(request.getEmployeeId());
        assertPropertyAccess(employee, actor);
        String reason = trim(request.getReason());
        String payrollMonth = request.getPayrollMonth().trim();
        if (repository.existsByEmployeeIdAndReasonIgnoreCaseAndPayrollMonthAndIdNot(employee.getId(), reason, payrollMonth, id)) {
            throw AppException.conflict("Deduction already exists for this employee, reason, and payroll month");
        }
        deduction.setEmployeeId(employee.getId());
        deduction.setAmount(request.getAmount());
        deduction.setReason(reason);
        deduction.setDeductionDate(request.getDeductionDate());
        deduction.setPayrollMonth(payrollMonth);
        PayrollDeduction saved = repository.save(deduction);
        return toResponse(saved, employee);
    }

    @Transactional
    public void delete(Long id) {
        User actor = currentUser();
        requireHr(actor);
        PayrollDeduction deduction = repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Deduction not found: " + id));
        Employee employee = employee(deduction.getEmployeeId());
        assertPropertyAccess(employee, actor);
        if (deduction.getStatus() != PayrollDeductionStatus.DRAFT) {
            throw AppException.badRequest("Only draft deductions can be deleted");
        }
        repository.delete(deduction);
    }

    @Transactional
    public PayrollDeductionResponse send(Long id) {
        User actor = currentUser();
        requireHr(actor);
        PayrollDeduction deduction = repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Deduction not found: " + id));
        Employee employee = employee(deduction.getEmployeeId());
        assertPropertyAccess(employee, actor);
        if (deduction.getStatus() != PayrollDeductionStatus.DRAFT) {
            throw AppException.badRequest("Only draft deductions can be sent to accountant");
        }
        deduction.setStatus(PayrollDeductionStatus.SENT_TO_ACCOUNTANT);
        PayrollDeduction saved = repository.save(deduction);
        notifyAccountants(saved, employee, NotificationType.HR_DEDUCTION_SENT_TO_ACCOUNTANT,
                "NOTIFICATIONS.HR_DEDUCTION_SENT_TITLE", "NOTIFICATIONS.HR_DEDUCTION_SENT_BODY");
        return toResponse(saved, employee);
    }

    @Transactional
    public PayrollDeductionResponse approve(Long id, PayrollDeductionDecisionRequest request) {
        return review(id, request, PayrollDeductionStatus.APPROVED, NotificationType.HR_DEDUCTION_APPROVED,
                "NOTIFICATIONS.HR_DEDUCTION_APPROVED_TITLE", "NOTIFICATIONS.HR_DEDUCTION_APPROVED_BODY");
    }

    @Transactional
    public PayrollDeductionResponse reject(Long id, PayrollDeductionDecisionRequest request) {
        return review(id, request, PayrollDeductionStatus.REJECTED, NotificationType.HR_DEDUCTION_REJECTED,
                "NOTIFICATIONS.HR_DEDUCTION_REJECTED_TITLE", "NOTIFICATIONS.HR_DEDUCTION_REJECTED_BODY");
    }

    private PayrollDeductionResponse review(Long id, PayrollDeductionDecisionRequest request, PayrollDeductionStatus status,
                                            NotificationType type, String titleKey, String bodyKey) {
        User actor = currentUser();
        if (actor.getRole() != UserRole.ACCOUNTANT && actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Only accountant or admin can review deductions");
        }
        PayrollDeduction deduction = repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Deduction not found: " + id));
        Employee employee = employee(deduction.getEmployeeId());
        assertPropertyAccess(employee, actor);
        if (deduction.getStatus() != PayrollDeductionStatus.SENT_TO_ACCOUNTANT) {
            throw AppException.badRequest("Only sent deductions can be reviewed");
        }
        deduction.setStatus(status);
        deduction.setReviewedBy(actor.getId());
        deduction.setReviewedAt(LocalDateTime.now());
        deduction.setReviewNote(request == null ? null : trimToNull(request.getNote()));
        PayrollDeduction saved = repository.save(deduction);
        notifyHr(saved, employee, type, titleKey, bodyKey);
        return toResponse(saved, employee);
    }

    private void notifyAccountants(PayrollDeduction deduction, Employee employee, NotificationType type, String titleKey, String bodyKey) {
        List<Long> recipients = userRepository.findActiveAccountantUserIdsForProperty(employee.getPropertyId());
        notificationService.createLocalized(recipients, currentUser().getId(), employee.getPropertyId(), deduction.getId(), type,
                titleKey, bodyKey, vars(deduction, employee), Map.of("route", "/admin/hr/payroll"));
    }

    private void notifyHr(PayrollDeduction deduction, Employee employee, NotificationType type, String titleKey, String bodyKey) {
        List<Long> recipients = userRepository.findByPropertyIdAndRoleAndActiveTrue(employee.getPropertyId(), UserRole.HR_OFFICER)
                .stream().map(User::getId).distinct().toList();
        notificationService.createLocalized(recipients, currentUser().getId(), employee.getPropertyId(), deduction.getId(), type,
                titleKey, bodyKey, vars(deduction, employee), Map.of("route", "/admin/hr/deductions"));
    }

    private Map<String, Object> vars(PayrollDeduction deduction, Employee employee) {
        return Map.of(
                "employee", employee.getFullName(),
                "amount", deduction.getAmount(),
                "month", deduction.getPayrollMonth()
        );
    }

    private PayrollDeductionResponse toResponse(PayrollDeduction item, Employee employee) {
        return PayrollDeductionResponse.builder()
                .id(item.getId())
                .employeeId(item.getEmployeeId())
                .employeeName(employee != null ? employee.getFullName() : null)
                .amount(item.getAmount())
                .reason(item.getReason())
                .deductionDate(item.getDeductionDate())
                .payrollMonth(item.getPayrollMonth())
                .status(item.getStatus())
                .reviewNote(item.getReviewNote())
                .reviewedAt(item.getReviewedAt())
                .createdAt(item.getCreatedAt())
                .build();
    }

    private Employee employee(Long id) {
        return employeeRepository.findById(id).orElseThrow(() -> AppException.notFound("Employee not found: " + id));
    }

    private void requireHr(User actor) {
        if (actor.getRole() != UserRole.HR_OFFICER && actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Only HR can manage deductions");
        }
    }

    private void assertPropertyAccess(Employee employee, User actor) {
        if (actor.getPropertyId() != null && !Objects.equals(actor.getPropertyId(), employee.getPropertyId())) {
            throw AppException.forbidden("You do not have access to this employee");
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private String trim(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) throw AppException.badRequest("Reason is required");
        return trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
