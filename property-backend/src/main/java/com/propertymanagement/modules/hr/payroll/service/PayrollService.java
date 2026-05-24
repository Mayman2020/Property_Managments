package com.propertymanagement.modules.hr.payroll.service;

import com.propertymanagement.modules.finance.expense.entity.Expense;
import com.propertymanagement.modules.finance.expense.repository.ExpenseCategoryLookupRepository;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.payroll.dto.*;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
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
import com.propertymanagement.modules.hr.payroll.entity.PayrollRun;
import com.propertymanagement.modules.hr.payroll.entity.Payslip;
import com.propertymanagement.modules.hr.payroll.entity.SalaryAdvance;
import com.propertymanagement.modules.hr.payroll.entity.EmployeeBonus;
import com.propertymanagement.modules.hr.payroll.entity.PayrollDeduction;
import com.propertymanagement.modules.hr.payroll.entity.PayrollDeductionStatus;
import com.propertymanagement.modules.hr.payroll.repository.PayrollRepository;
import com.propertymanagement.modules.hr.payroll.repository.PayslipRepository;
import com.propertymanagement.modules.hr.payroll.repository.SalaryAdvanceRepository;
import com.propertymanagement.modules.hr.payroll.repository.EmployeeBonusRepository;
import com.propertymanagement.modules.hr.payroll.repository.PayrollDeductionRepository;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class PayrollService {

    private static final String PAYROLL_EXPENSE_CODE = "PAY-SALARY";

    private final PayrollRepository repository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryAdvanceRepository salaryAdvanceRepository;
    private final EmployeeBonusRepository employeeBonusRepository;
    private final PayrollDeductionRepository payrollDeductionRepository;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final ExpenseCategoryLookupRepository expenseCategoryLookupRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public Page<PayrollRunResponse> getAll(Pageable pageable) {
        User actor = currentUser();
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) return Page.empty(pageable);
            return repository.findAllByPropertyIdInOrderByPayPeriodYearDescPayPeriodMonthDesc(ownerScope, pageable)
                    .map(this::toResponse);
        }
        if (actor.getPropertyId() != null && (actor.getRole() == UserRole.ACCOUNTANT || actor.getRole() == UserRole.HR_OFFICER)) {
            return repository.findAllByPropertyIdOrderByPayPeriodYearDescPayPeriodMonthDesc(actor.getPropertyId(), pageable)
                    .map(this::toResponse);
        }
        return repository.findAllByOrderByPayPeriodYearDescPayPeriodMonthDesc(pageable)
                .map(this::toResponse);
    }

    public PayrollRunDetailResponse getById(Long id) {
        PayrollRun run = findScoped(id);
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
            BigDecimal hrDeduction = approvedHrDeductions(employee.getId(), request.getPayPeriodYear(), request.getPayPeriodMonth())
                    .stream()
                    .map(PayrollDeduction::getAmount)
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
                    .otherDeductions(hrDeduction)
                    .notes(null)
                    .build();
            recalculateSlip(slip);
            payslipRepository.save(slip);
        }

        refreshRunTotals(run);
        createPayrollExpense(run);
        notifyPayrollGenerated(run);
        notifyPayrollSubmitted(run);
        notifyHrDeductionsApplied(run);
        return toDetailResponse(run);
    }

    @Transactional
    public PayrollRunDetailResponse adjustPayslip(Long payrollRunId, Long payslipId, PayslipAdjustRequest request) {
        PayrollRun run = findScoped(payrollRunId);
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
        PayrollRun run = findScoped(payrollRunId);
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

        SalaryAdvance saved = salaryAdvanceRepository.save(SalaryAdvance.builder()
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
        notifySalaryAdvanceCreated(saved, employee);
        return saved;
    }

    @Transactional
    public SalaryAdvance rejectAdvance(Long advanceId, String reason) {
        SalaryAdvance advance = salaryAdvanceRepository.findById(advanceId)
                .orElseThrow(() -> AppException.notFound("Salary advance not found: " + advanceId));
        if ("REJECTED".equalsIgnoreCase(advance.getStatus())) {
            return advance;
        }
        if ("DEDUCTED".equalsIgnoreCase(advance.getStatus())) {
            throw AppException.badRequest("Cannot reject a salary advance that was already deducted");
        }
        Employee employee = employeeRepository.findById(advance.getEmployeeId())
                .orElseThrow(() -> AppException.notFound("Employee not found: " + advance.getEmployeeId()));
        advance.setStatus("REJECTED");
        advance.setNotes(trimToNull(reason));
        salaryAdvanceRepository.save(advance);
        notifySalaryAdvanceRejected(advance, employee, reason);
        return advance;
    }

    @Transactional
    public PayrollRunDetailResponse approve(Long id) {
        PayrollRun run = findScoped(id);
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
        PayrollRun run = findScoped(id);
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

    private PayrollRun findScoped(Long id) {
        User actor = currentUser();
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                throw AppException.forbidden("You do not have access to this payroll run");
            }
            return repository.findByIdAndPropertyIdIn(id, ownerScope)
                    .orElseThrow(() -> AppException.notFound("Payroll run not found: " + id));
        }
        if (actor.getPropertyId() != null && (actor.getRole() == UserRole.ACCOUNTANT || actor.getRole() == UserRole.HR_OFFICER)) {
            return repository.findByIdAndPropertyId(id, actor.getPropertyId())
                    .orElseThrow(() -> AppException.notFound("Payroll run not found: " + id));
        }
        return find(id);
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
            employeeRepository.findById(employeeId).ifPresent(emp ->
                    advances.forEach(adv -> notifySalaryAdvanceDeducted(emp, adv, run)));
        }
    }

    // PHASE1-DONE: TASK1 PAYROLL_GENERATED
    private void notifyPayrollGenerated(PayrollRun run) {
        List<Long> recipients = payrollHrRecipients(run.getPropertyId());
        if (recipients.isEmpty()) {
            return;
        }
        notificationService.createForRecipients(
                recipients,
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_GENERATED,
                "تم إنشاء مسير الرواتب",
                "مسير رواتب " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " جاهز للمراجعة");
    }

    // PHASE1-DONE: TASK1 SALARY_ADVANCE_* 
    private void notifySalaryAdvanceCreated(SalaryAdvance advance, Employee employee) {
        Long propertyId = employee.getPropertyId();
        List<Long> hr = payrollHrRecipients(propertyId);
        if (!hr.isEmpty()) {
            notificationService.createForRecipients(
                    hr,
                    currentUser().getId(),
                    propertyId,
                    advance.getId(),
                    NotificationType.SALARY_ADVANCE_REQUESTED,
                    "طلب سلفة راتب",
                    employee.getFullName() + " — مبلغ " + advance.getAmount());
        }
        if (employee.getLinkedUserId() != null) {
            notificationService.createForRecipients(
                    List.of(employee.getLinkedUserId()),
                    currentUser().getId(),
                    propertyId,
                    advance.getId(),
                    NotificationType.SALARY_ADVANCE_APPROVED,
                    "تمت الموافقة على السلفة",
                    "مبلغ " + advance.getAmount() + " — خصم " + advance.getDeductedMonth() + "/" + advance.getDeductedYear());
        }
    }

    private void notifySalaryAdvanceDeducted(Employee employee, SalaryAdvance advance, PayrollRun run) {
        if (employee.getLinkedUserId() == null) {
            return;
        }
        notificationService.createForRecipients(
                List.of(employee.getLinkedUserId()),
                null,
                employee.getPropertyId(),
                advance.getId(),
                NotificationType.SALARY_ADVANCE_DEDUCTED,
                "خصم السلفة من الراتب",
                "تم خصم " + advance.getAmount() + " من راتب " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear());
    }

    private void notifySalaryAdvanceRejected(SalaryAdvance advance, Employee employee, String reason) {
        if (employee.getLinkedUserId() == null) {
            return;
        }
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("amount", advance.getAmount());
        vars.put("reason", reason != null && !reason.isBlank() ? reason : "—");
        notificationService.createLocalized(
                List.of(employee.getLinkedUserId()),
                currentUser().getId(),
                employee.getPropertyId(),
                advance.getId(),
                NotificationType.SALARY_ADVANCE_REJECTED,
                "NOTIFICATIONS.SALARY_ADVANCE_REJECTED_TITLE",
                "NOTIFICATIONS.SALARY_ADVANCE_REJECTED_BODY",
                vars);
    }

    private List<Long> payrollHrRecipients(Long propertyId) {
        List<Long> recipients = new ArrayList<>();
        userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream().map(User::getId).forEach(recipients::add);
        userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream().map(User::getId).forEach(recipients::add);
        if (propertyId != null) {
            userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT).stream()
                    .map(User::getId).forEach(recipients::add);
        }
        return recipients.stream().distinct().toList();
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
                .map(com.propertymanagement.modules.finance.expense.entity.ExpenseCategory::getId)
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

    private List<PayrollDeduction> approvedHrDeductions(Long employeeId, int year, int month) {
        return payrollDeductionRepository.findByEmployeeIdAndPayrollMonthAndStatus(
                employeeId,
                payrollMonthKey(year, month),
                PayrollDeductionStatus.APPROVED);
    }

    private String payrollMonthKey(int year, int month) {
        return year + "-" + String.format("%02d", month);
    }

    private void notifyHrDeductionsApplied(PayrollRun run) {
        boolean hasApprovedDeductions = payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId()).stream()
                .anyMatch(slip -> approvedHrDeductions(slip.getEmployeeId(), run.getPayPeriodYear(), run.getPayPeriodMonth()).stream()
                        .anyMatch(deduction -> n(deduction.getAmount()).signum() > 0));
        if (!hasApprovedDeductions) return;
        List<Long> recipients = userRepository.findByPropertyIdAndRoleAndActiveTrue(run.getPropertyId(), UserRole.ACCOUNTANT)
                .stream().map(User::getId).distinct().toList();
        if (recipients.isEmpty()) return;
        notificationService.createLocalized(
                recipients,
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_HR_DEDUCTION_APPLIED,
                "NOTIFICATIONS.PAYROLL_HR_DEDUCTION_APPLIED_TITLE",
                "NOTIFICATIONS.PAYROLL_HR_DEDUCTION_APPLIED_BODY",
                Map.of("month", payrollMonthKey(run.getPayPeriodYear(), run.getPayPeriodMonth())),
                Map.of("route", "/admin/hr/payroll/" + run.getId())
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

    @Transactional
    public PayrollRunDetailResponse reject(Long id, String reason) {
        PayrollRun run = findScoped(id);
        if (!"SUBMITTED".equalsIgnoreCase(run.getStatus()) && !"DRAFT".equalsIgnoreCase(run.getStatus())) {
            throw AppException.badRequest("Only DRAFT or SUBMITTED payroll can be rejected");
        }
        User actor = currentUser();
        if (actor.getRole() != UserRole.OWNER
                && actor.getRole() != UserRole.SUPER_ADMIN
                && actor.getRole() != UserRole.GENERAL_MANAGER) {
            throw AppException.forbidden("Only manager or owner can reject payroll");
        }
        run.setStatus("REJECTED");
        if (reason != null && !reason.isBlank()) {
            run.setNotes(reason.trim());
        }
        repository.save(run);
        syncPayrollExpense(run);
        notifyPayrollRejected(run);
        return toDetailResponse(run);
    }

    /** Returns all payslips for the currently authenticated employee (linked via linkedUserId). */
    public List<PayslipResponse> getMyPayslips() {
        User actor = currentUser();
        Employee emp = employeeRepository.findByLinkedUserId(actor.getId())
                .orElseThrow(() -> AppException.notFound("No employee record linked to your account"));
        return payslipRepository.findByEmployeeIdOrderByCreatedAtDesc(emp.getId())
                .stream()
                .map(slip -> toPayslipResponse(slip, emp))
                .toList();
    }

    public PayslipResponse getMyPayslipById(Long payslipId) {
        User actor = currentUser();
        Employee emp = employeeRepository.findByLinkedUserId(actor.getId())
                .orElseThrow(() -> AppException.notFound("No employee record linked to your account"));
        Payslip slip = payslipRepository.findByIdAndEmployeeId(payslipId, emp.getId())
                .orElseThrow(() -> AppException.notFound("Payslip not found"));
        return toPayslipResponse(slip, emp);
    }

    private void notifyPayrollMarkedPaid(PayrollRun run, List<Payslip> slips) {
        List<Long> managerRecipients = new ArrayList<>();
        managerRecipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(run.getPropertyId()));
        managerRecipients.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(run.getPropertyId(), UserRole.ACCOUNTANT)
                .stream().map(User::getId).toList());
        notificationService.createForRecipients(
                managerRecipients.stream().distinct().toList(),
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_MARKED_PAID,
                "Payroll paid",
                "Payroll for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " marked as paid"
        );
        // Per-employee PAYSLIP_AVAILABLE notification
        for (Payslip slip : slips) {
            employeeRepository.findById(slip.getEmployeeId()).ifPresent(emp -> {
                Long linkedUserId = emp.getLinkedUserId();
                if (linkedUserId != null) {
                    notificationService.createForRecipients(
                            List.of(linkedUserId),
                            currentUser().getId(),
                            run.getPropertyId(),
                            slip.getId(),
                            NotificationType.PAYSLIP_AVAILABLE,
                            "قسيمة راتبك جاهزة",
                            "قسيمة راتبك لشهر " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " متاحة الآن"
                    );
                }
            });
        }
    }

    private void notifyPayrollRejected(PayrollRun run) {
        List<Long> recipients = new ArrayList<>();
        recipients.addAll(userRepository.findByPropertyIdAndRoleAndActiveTrue(run.getPropertyId(), UserRole.ACCOUNTANT)
                .stream().map(User::getId).toList());
        notificationService.createForRecipients(
                recipients.stream().distinct().toList(),
                currentUser().getId(),
                run.getPropertyId(),
                run.getId(),
                NotificationType.PAYROLL_REJECTED,
                "Payroll rejected",
                "Payroll for " + run.getPayPeriodMonth() + "/" + run.getPayPeriodYear() + " was rejected"
                        + (run.getNotes() != null ? ": " + run.getNotes() : "")
        );
    }
}
