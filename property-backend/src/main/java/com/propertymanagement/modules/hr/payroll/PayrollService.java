package com.propertymanagement.modules.hr.payroll;

import com.propertymanagement.modules.finance.expense.Expense;
import com.propertymanagement.modules.finance.expense.ExpenseCategoryLookupRepository;
import com.propertymanagement.modules.finance.expense.ExpenseWriterRepository;
import com.propertymanagement.modules.hr.employee.Employee;
import com.propertymanagement.modules.hr.employee.EmployeeRepository;
import com.propertymanagement.modules.hr.payroll.dto.*;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.property.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PayrollService {

    private static final String PAYROLL_EXPENSE_CODE = "PAY-SALARY";

    private final PayrollRepository repository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryAdvanceRepository salaryAdvanceRepository;
    private final EmployeeBonusRepository employeeBonusRepository;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final ExpenseCategoryLookupRepository expenseCategoryLookupRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;

    public Page<PayrollRunResponse> getAll(Pageable pageable) {
        return repository.findAllByOrderByPayPeriodYearDescPayPeriodMonthDesc(pageable)
                .map(this::toResponse);
    }

    public PayrollRunDetailResponse getById(Long id) {
        PayrollRun run = find(id);
        return toDetailResponse(run);
    }

    @Transactional
    public PayrollRunDetailResponse generate(GeneratePayrollRequest request) {
        User user = currentUser();
        Long propertyId = resolvePropertyId(user, request.getPropertyId());
        repository.findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(propertyId, request.getPayPeriodYear(), request.getPayPeriodMonth())
                .ifPresent(existing -> {
                    throw AppException.conflict("Payroll already exists for this property and period");
                });

        List<Employee> employees = employeeRepository.findByPropertyIdAndStatusOrderByFullNameAsc(propertyId, "ACTIVE");
        if (employees.isEmpty()) {
            throw AppException.badRequest("No active employees found for this property");
        }

        PayrollRun run = repository.save(PayrollRun.builder()
                .propertyId(propertyId)
                .payPeriodYear(request.getPayPeriodYear())
                .payPeriodMonth(request.getPayPeriodMonth())
                .payDate(LocalDate.of(request.getPayPeriodYear(), request.getPayPeriodMonth(), 25))
                .status("SUBMITTED")
                .preparedBy(user.getId())
                .notes("Generated from active employees")
                .build());

        for (Employee employee : employees) {
            BigDecimal advanceDeduction = salaryAdvanceRepository
                    .findByEmployeeIdAndStatusAndDeductedYearAndDeductedMonth(employee.getId(), "APPROVED", request.getPayPeriodYear(), request.getPayPeriodMonth())
                    .stream()
                    .map(SalaryAdvance::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Payslip slip = Payslip.builder()
                    .payrollRunId(run.getId())
                    .employeeId(employee.getId())
                    .basicSalary(n(employee.getBasicSalary()))
                    .housingAllowance(n(employee.getHousingAllowance()))
                    .transportAllowance(n(employee.getTransportAllowance()))
                    .otherAllowances(n(employee.getOtherAllowances()))
                    .advanceDeduction(advanceDeduction)
                    .notes(null)
                    .build();
            recalculateSlip(slip);
            payslipRepository.save(slip);
        }

        refreshRunTotals(run);
        createPayrollExpense(run);
        notifyPayrollSubmitted(run);
        return toDetailResponse(run);
    }

    @Transactional
    public PayrollRunDetailResponse adjustPayslip(Long payrollRunId, Long payslipId, PayslipAdjustRequest request) {
        PayrollRun run = find(payrollRunId);
        ensureEditable(run);

        Payslip slip = payslipRepository.findByIdAndPayrollRunId(payslipId, payrollRunId)
                .orElseThrow(() -> AppException.notFound("Payslip not found: " + payslipId));

        if (request.getOvertimeAmount() != null) slip.setOvertimeAmount(request.getOvertimeAmount());
        if (request.getAbsenceDeduction() != null) slip.setAbsenceDeduction(request.getAbsenceDeduction());
        if (request.getLateDeduction() != null) slip.setLateDeduction(request.getLateDeduction());
        if (request.getPenaltyDeduction() != null) slip.setPenaltyDeduction(request.getPenaltyDeduction());
        if (request.getInsuranceDeduction() != null) slip.setInsuranceDeduction(request.getInsuranceDeduction());
        if (request.getOtherDeductions() != null) slip.setOtherDeductions(request.getOtherDeductions());
        if (request.getNotes() != null) slip.setNotes(trimToNull(request.getNotes()));

        recalculateSlip(slip);
        payslipRepository.save(slip);
        refreshRunTotals(run);
        syncPayrollExpense(run);
        return toDetailResponse(run);
    }

    @Transactional
    public PayrollRunDetailResponse addBonus(Long payrollRunId, BonusRequest request) {
        PayrollRun run = find(payrollRunId);
        ensureEditable(run);
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> AppException.notFound("Employee not found: " + request.getEmployeeId()));
        ensureEmployeeInProperty(employee, run.getPropertyId());

        employeeBonusRepository.save(EmployeeBonus.builder()
                .payrollRunId(run.getId())
                .employeeId(employee.getId())
                .bonusType(request.getBonusType().trim().toUpperCase(Locale.ROOT))
                .amount(request.getAmount())
                .reason(trimToNull(request.getReason()))
                .approvedBy(currentUser().getId())
                .build());

        Payslip slip = payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId()).stream()
                .filter(item -> Objects.equals(item.getEmployeeId(), employee.getId()))
                .findFirst()
                .orElseThrow(() -> AppException.notFound("Payslip not found for employee"));

        recalculateSlip(slip);
        payslipRepository.save(slip);
        refreshRunTotals(run);
        syncPayrollExpense(run);
        return toDetailResponse(run);
    }

    @Transactional
    public SalaryAdvance createAdvance(SalaryAdvanceRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> AppException.notFound("Employee not found: " + request.getEmployeeId()));

        return salaryAdvanceRepository.save(SalaryAdvance.builder()
                .employeeId(employee.getId())
                .amount(request.getAmount())
                .requestDate(request.getRequestDate())
                .approvedDate(LocalDate.now())
                .reason(trimToNull(request.getReason()))
                .status("APPROVED")
                .deductedYear(request.getDeductedYear())
                .deductedMonth(request.getDeductedMonth())
                .approvedBy(currentUser().getId())
                .notes(trimToNull(request.getNotes()))
                .build());
    }

    @Transactional
    public PayrollRunDetailResponse approve(Long id) {
        PayrollRun run = find(id);
        if (!"SUBMITTED".equalsIgnoreCase(run.getStatus())) {
            throw AppException.badRequest("Only submitted payroll can be approved");
        }
        User actor = currentUser();
        if (actor.getRole() != UserRole.OWNER
                && actor.getRole() != UserRole.SUPER_ADMIN
                && actor.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Only owner can approve payroll");
        }
        run.setStatus("APPROVED");
        run.setApprovedBy(actor.getId());
        repository.save(run);
        syncPayrollExpense(run);
        notifyPayrollApproved(run);
        return toDetailResponse(run);
    }

    @Transactional
    public PayrollRunDetailResponse markPaid(Long id, PayrollPaidRequest request) {
        PayrollRun run = find(id);
        if (!"APPROVED".equalsIgnoreCase(run.getStatus()) && !"PAID".equalsIgnoreCase(run.getStatus())) {
            throw AppException.badRequest("Payroll must be approved before marking as paid");
        }

        List<Payslip> slips = payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId());
        for (Payslip slip : slips) {
            slip.setPaid(true);
            slip.setPaidDate(request.getPaidDate());
            slip.setPaymentMethod(request.getPaymentMethod().trim());
            slip.setReferenceNumber(trimToNull(request.getReferenceNumber()));
        }
        payslipRepository.saveAll(slips);

        run.setStatus("PAID");
        run.setPayDate(request.getPaidDate());
        repository.save(run);
        syncPayrollExpense(run);
        markAdvancesDeducted(run, slips);
        notifyPayrollMarkedPaid(run, slips);
        return toDetailResponse(run);
    }

    private PayrollRun find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Payroll run not found: " + id));
    }

    private PayrollRunResponse toResponse(PayrollRun run) {
        return PayrollRunResponse.builder()
                .id(run.getId())
                .propertyId(run.getPropertyId())
                .payPeriodYear(run.getPayPeriodYear())
                .payPeriodMonth(run.getPayPeriodMonth())
                .payDate(run.getPayDate())
                .status(run.getStatus())
                .totalBasic(n(run.getTotalBasic()))
                .totalAllowances(n(run.getTotalAllowances()))
                .totalDeductions(n(run.getTotalDeductions()))
                .totalBonuses(n(run.getTotalBonuses()))
                .totalNet(n(run.getTotalNet()))
                .build();
    }

    private PayrollRunDetailResponse toDetailResponse(PayrollRun run) {
        List<Employee> employees = employeeRepository.findAllById(
                payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId()).stream()
                        .map(Payslip::getEmployeeId)
                        .toList()
        );
        Map<Long, Employee> employeesById = employees.stream()
                .collect(Collectors.toMap(Employee::getId, item -> item));

        List<PayslipResponse> slips = payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId()).stream()
                .map(item -> toPayslipResponse(item, employeesById.get(item.getEmployeeId())))
                .toList();

        return PayrollRunDetailResponse.builder()
                .id(run.getId())
                .propertyId(run.getPropertyId())
                .payPeriodYear(run.getPayPeriodYear())
                .payPeriodMonth(run.getPayPeriodMonth())
                .payDate(run.getPayDate())
                .status(run.getStatus())
                .totalBasic(n(run.getTotalBasic()))
                .totalAllowances(n(run.getTotalAllowances()))
                .totalDeductions(n(run.getTotalDeductions()))
                .totalBonuses(n(run.getTotalBonuses()))
                .totalNet(n(run.getTotalNet()))
                .notes(run.getNotes())
                .payslips(slips)
                .build();
    }

    private PayslipResponse toPayslipResponse(Payslip item, Employee employee) {
        return PayslipResponse.builder()
                .id(item.getId())
                .employeeId(item.getEmployeeId())
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .employeeName(employee != null ? employee.getFullName() : null)
                .jobTitle(employee != null ? firstNonBlank(employee.getJobTitleAr(), employee.getJobTitleEn()) : null)
                .basicSalary(n(item.getBasicSalary()))
                .housingAllowance(n(item.getHousingAllowance()))
                .transportAllowance(n(item.getTransportAllowance()))
                .otherAllowances(n(item.getOtherAllowances()))
                .overtimeAmount(n(item.getOvertimeAmount()))
                .bonusAmount(n(item.getBonusAmount()))
                .totalEarnings(n(item.getTotalEarnings()))
                .advanceDeduction(n(item.getAdvanceDeduction()))
                .absenceDeduction(n(item.getAbsenceDeduction()))
                .lateDeduction(n(item.getLateDeduction()))
                .penaltyDeduction(n(item.getPenaltyDeduction()))
                .insuranceDeduction(n(item.getInsuranceDeduction()))
                .otherDeductions(n(item.getOtherDeductions()))
                .totalDeductions(n(item.getTotalDeductions()))
                .netSalary(n(item.getNetSalary()))
                .paid(Boolean.TRUE.equals(item.getPaid()))
                .paidDate(item.getPaidDate())
                .paymentMethod(item.getPaymentMethod())
                .referenceNumber(item.getReferenceNumber())
                .notes(item.getNotes())
                .build();
    }

    private void recalculateSlip(Payslip slip) {
        BigDecimal bonusAmount = employeeBonusRepository.findByPayrollRunIdAndEmployeeId(slip.getPayrollRunId(), slip.getEmployeeId()).stream()
                .map(EmployeeBonus::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        slip.setBonusAmount(bonusAmount);

        BigDecimal earnings = n(slip.getBasicSalary())
                .add(n(slip.getHousingAllowance()))
                .add(n(slip.getTransportAllowance()))
                .add(n(slip.getOtherAllowances()))
                .add(n(slip.getOvertimeAmount()))
                .add(n(slip.getBonusAmount()));
        slip.setTotalEarnings(earnings.setScale(2, RoundingMode.HALF_UP));

        BigDecimal deductions = n(slip.getAbsenceDeduction())
                .add(n(slip.getLateDeduction()))
                .add(n(slip.getAdvanceDeduction()))
                .add(n(slip.getPenaltyDeduction()))
                .add(n(slip.getInsuranceDeduction()))
                .add(n(slip.getOtherDeductions()));
        slip.setTotalDeductions(deductions.setScale(2, RoundingMode.HALF_UP));
        slip.setNetSalary(slip.getTotalEarnings().subtract(slip.getTotalDeductions()).setScale(2, RoundingMode.HALF_UP));
    }

    private void refreshRunTotals(PayrollRun run) {
        List<Payslip> slips = payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId());
        run.setTotalBasic(slips.stream().map(Payslip::getBasicSalary).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
        run.setTotalAllowances(slips.stream().map(this::allowancesTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
        run.setTotalDeductions(slips.stream().map(Payslip::getTotalDeductions).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
        run.setTotalBonuses(slips.stream().map(Payslip::getBonusAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
        run.setTotalNet(slips.stream().map(Payslip::getNetSalary).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
        repository.save(run);
    }

    private BigDecimal allowancesTotal(Payslip slip) {
        return n(slip.getHousingAllowance()).add(n(slip.getTransportAllowance())).add(n(slip.getOtherAllowances()));
    }

    private void createPayrollExpense(PayrollRun run) {
        expenseWriterRepository.save(Expense.builder()
                .expenseNumber(generateExpenseNumber(run, null))
                .propertyId(run.getPropertyId())
                .categoryId(payrollExpenseCategoryId())
                .description("Payroll expense for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear())
                .amount(n(run.getTotalNet()))
                .currency("SAR")
                .expenseDate(run.getPayDate())
                .payrollRunId(run.getId())
                .status(statusToExpenseStatus(run.getStatus()))
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void syncPayrollExpense(PayrollRun run) {
        // Create a new synchronized expense snapshot per status change to keep payroll and finance aligned.
        expenseWriterRepository.save(Expense.builder()
                .expenseNumber(generateExpenseNumber(run, run.getStatus()))
                .propertyId(run.getPropertyId())
                .categoryId(payrollExpenseCategoryId())
                .description("Payroll " + run.getStatus().toLowerCase(Locale.ROOT) + " for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear())
                .amount(n(run.getTotalNet()))
                .currency("SAR")
                .expenseDate(Optional.ofNullable(run.getPayDate()).orElse(LocalDate.now()))
                .payrollRunId(run.getId())
                .status(statusToExpenseStatus(run.getStatus()))
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void markAdvancesDeducted(PayrollRun run, List<Payslip> slips) {
        Set<Long> employeeIds = slips.stream().map(Payslip::getEmployeeId).collect(Collectors.toSet());
        for (Long employeeId : employeeIds) {
            List<SalaryAdvance> advances = salaryAdvanceRepository
                    .findByEmployeeIdAndStatusAndDeductedYearAndDeductedMonth(employeeId, "APPROVED", run.getPayPeriodYear(), run.getPayPeriodMonth());
            advances.forEach(item -> item.setStatus("DEDUCTED"));
            salaryAdvanceRepository.saveAll(advances);
        }
    }

    private void ensureEditable(PayrollRun run) {
        if (!"SUBMITTED".equalsIgnoreCase(run.getStatus())) {
            throw AppException.badRequest("Only submitted payroll can be modified");
        }
    }

    private void ensureEmployeeInProperty(Employee employee, Long propertyId) {
        if (propertyId != null && !Objects.equals(employee.getPropertyId(), propertyId)) {
            throw AppException.badRequest("Employee does not belong to the selected property");
        }
    }

    private Long resolvePropertyId(User user, Long requestedPropertyId) {
        if (requestedPropertyId != null) {
            return requestedPropertyId;
        }
        if (user.getPropertyId() != null) {
            return user.getPropertyId();
        }
        throw AppException.badRequest("Property id is required for this user");
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private BigDecimal n(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String generateExpenseNumber(PayrollRun run, String suffix) {
        String base = "EXP-PAY-" + run.getPayPeriodYear() + String.format("%02d", run.getPayPeriodMonth()) + "-" + run.getId();
        if (suffix == null || suffix.isBlank()) {
            return base;
        }
        return base + "-" + suffix + "-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
    }

    private String statusToExpenseStatus(String payrollStatus) {
        if ("PAID".equalsIgnoreCase(payrollStatus)) return "PAID";
        if ("APPROVED".equalsIgnoreCase(payrollStatus)) return "APPROVED";
        return "PENDING";
    }

    private Long payrollExpenseCategoryId() {
        return expenseCategoryLookupRepository.findByCategoryCode(PAYROLL_EXPENSE_CODE)
                .map(com.propertymanagement.modules.finance.expense.ExpenseCategory::getId)
                .orElseThrow(() -> AppException.notFound("Expense category not found: " + PAYROLL_EXPENSE_CODE));
    }

    private void notifyPayrollSubmitted(PayrollRun run) {
        List<Long> recipients = new ArrayList<>();
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(run.getPropertyId()));
        recipients.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(run.getPropertyId(), UserRole.ACCOUNTANT)
                .stream().map(User::getId).toList());
        notificationService.createForRecipients(
                recipients.stream().distinct().toList(),
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_SUBMITTED,
                "Payroll submitted",
                "Payroll for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " has been submitted"
        );
    }

    private void notifyPayrollApproved(PayrollRun run) {
        List<Long> recipients = new ArrayList<>();
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(run.getPropertyId()));
        recipients.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(run.getPropertyId(), UserRole.ACCOUNTANT)
                .stream().map(User::getId).toList());
        notificationService.createForRecipients(
                recipients.stream().distinct().toList(),
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_APPROVED,
                "Payroll approved",
                "Payroll for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " was approved"
        );
    }

    private void notifyPayrollMarkedPaid(PayrollRun run, List<Payslip> slips) {
        List<Long> recipients = new ArrayList<>();
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(run.getPropertyId()));
        recipients.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(run.getPropertyId(), UserRole.ACCOUNTANT)
                .stream().map(User::getId).toList());
        for (Payslip slip : slips) {
            employeeRepository.findById(slip.getEmployeeId())
                    .map(Employee::getLinkedUserId)
                    .filter(Objects::nonNull)
                    .ifPresent(recipients::add);
        }
        notificationService.createForRecipients(
                recipients.stream().distinct().toList(),
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_MARKED_PAID,
                "Payroll paid",
                "Payroll for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " marked as paid"
        );
    }
}
