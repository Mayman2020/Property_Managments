package com.propertymanagement.modules.hr;

import com.propertymanagement.modules.finance.expense.repository.ExpenseCategoryLookupRepository;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.payroll.entity.EmployeeBonus;
import com.propertymanagement.modules.hr.payroll.entity.PayrollRun;
import com.propertymanagement.modules.hr.payroll.entity.Payslip;
import com.propertymanagement.modules.hr.payroll.entity.SalaryAdvance;
import com.propertymanagement.modules.hr.payroll.repository.EmployeeBonusRepository;
import com.propertymanagement.modules.hr.payroll.repository.PayrollRepository;
import com.propertymanagement.modules.hr.payroll.repository.PayslipRepository;
import com.propertymanagement.modules.hr.payroll.repository.SalaryAdvanceRepository;
import com.propertymanagement.modules.hr.payroll.service.PayrollService;
import com.propertymanagement.modules.hr.payroll.dto.GeneratePayrollRequest;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollServiceTest {

    @Mock PayrollRepository repository;
    @Mock PayslipRepository payslipRepository;
    @Mock EmployeeRepository employeeRepository;
    @Mock SalaryAdvanceRepository salaryAdvanceRepository;
    @Mock EmployeeBonusRepository employeeBonusRepository;
    @Mock ExpenseWriterRepository expenseWriterRepository;
    @Mock ExpenseCategoryLookupRepository expenseCategoryLookupRepository;
    @Mock NotificationService notificationService;
    @Mock UserRepository userRepository;
    @Mock PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    @Mock OwnerPropertyAccessService ownerPropertyAccessService;

    @InjectMocks PayrollService service;

    private User superAdmin;

    @BeforeEach
    void setUp() {
        superAdmin = User.builder().id(1L).role(UserRole.SUPER_ADMIN).propertyId(10L).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(superAdmin, null, List.of()));
    }

    // ── DUPLICATE GENERATION PREVENTION ──────────────────────────────────────

    @Test
    void generate_throwsConflict_whenRunAlreadyExistsForPropertyAndPeriod() {
        PayrollRun existing = PayrollRun.builder()
                .id(99L).propertyId(10L).payPeriodYear(2025).payPeriodMonth(3).status("SUBMITTED").build();
        when(repository.findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(10L, 2025, 3))
                .thenReturn(Optional.of(existing));

        GeneratePayrollRequest req = new GeneratePayrollRequest();
        req.setPropertyId(10L);
        req.setPayPeriodYear(2025);
        req.setPayPeriodMonth(3);

        assertThatThrownBy(() -> service.generate(req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Payroll already exists");

        verify(repository, never()).save(any(PayrollRun.class));
    }

    @Test
    void generate_throwsBadRequest_whenNoActiveEmployees() {
        when(repository.findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(10L, 2025, 4))
                .thenReturn(Optional.empty());
        when(employeeRepository.findByPropertyIdAndStatusOrderByFullNameAsc(10L, "ACTIVE"))
                .thenReturn(List.of());

        GeneratePayrollRequest req = new GeneratePayrollRequest();
        req.setPropertyId(10L);
        req.setPayPeriodYear(2025);
        req.setPayPeriodMonth(4);

        assertThatThrownBy(() -> service.generate(req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("No active employees");
    }

    @Test
    void generate_succeeds_whenNoPriorRunExistsForPeriod() {
        when(repository.findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(10L, 2025, 5))
                .thenReturn(Optional.empty());

        Employee emp = Employee.builder().id(1L).propertyId(10L).fullName("Alice").status("ACTIVE")
                .basicSalary(BigDecimal.valueOf(5000)).build();
        when(employeeRepository.findByPropertyIdAndStatusOrderByFullNameAsc(10L, "ACTIVE"))
                .thenReturn(List.of(emp));

        PayrollRun savedRun = PayrollRun.builder().id(50L).propertyId(10L)
                .payPeriodYear(2025).payPeriodMonth(5).status("SUBMITTED")
                .payDate(LocalDate.of(2025, 5, 25)).totalNet(BigDecimal.valueOf(5000)).build();
        when(repository.save(any(PayrollRun.class))).thenReturn(savedRun);

        when(salaryAdvanceRepository.findByEmployeeIdAndStatusAndDeductedYearAndDeductedMonth(
                anyLong(), anyString(), anyInt(), anyInt())).thenReturn(List.of());
        when(employeeBonusRepository.findByPayrollRunIdAndEmployeeId(anyLong(), anyLong()))
                .thenReturn(List.of());
        when(payslipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(payslipRepository.findByPayrollRunIdOrderByIdAsc(anyLong())).thenReturn(List.of());
        com.propertymanagement.modules.finance.expense.entity.ExpenseCategory cat =
                new com.propertymanagement.modules.finance.expense.entity.ExpenseCategory();
        cat.setId(7L);
        cat.setCategoryCode("PAY-SALARY");
        when(expenseCategoryLookupRepository.findByCategoryCode("PAY-SALARY")).thenReturn(Optional.of(cat));
        when(expenseWriterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(propertyOwnerPortalRecipientService.portalRecipientUserIds(anyLong())).thenReturn(List.of());
        when(userRepository.findByPropertyIdAndRoleAndActiveTrue(anyLong(), any())).thenReturn(List.of());

        GeneratePayrollRequest req = new GeneratePayrollRequest();
        req.setPropertyId(10L);
        req.setPayPeriodYear(2025);
        req.setPayPeriodMonth(5);

        var result = service.generate(req);

        verify(repository, atLeastOnce()).save(any(PayrollRun.class));
        org.assertj.core.api.Assertions.assertThat(result).isNotNull();
    }

    // ── APPROVE GUARD ─────────────────────────────────────────────────────────

    @Test
    void approve_throwsBadRequest_whenPayrollNotInSubmittedStatus() {
        PayrollRun approved = PayrollRun.builder().id(1L).propertyId(10L).status("APPROVED").build();
        when(ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner()).thenReturn(null);
        when(repository.findById(1L)).thenReturn(Optional.of(approved));

        assertThatThrownBy(() -> service.approve(1L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Only submitted payroll");
    }

    @Test
    void approve_throwsForbidden_whenActorIsNotOwnerOrSuperAdminOrManager() {
        User accountant = User.builder().id(5L).role(UserRole.ACCOUNTANT).propertyId(10L).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(accountant, null, List.of()));

        PayrollRun submitted = PayrollRun.builder().id(2L).propertyId(10L).status("SUBMITTED").build();
        when(ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner()).thenReturn(null);
        // ACCOUNTANT with propertyId → findScoped calls findByIdAndPropertyId
        when(repository.findByIdAndPropertyId(2L, 10L)).thenReturn(Optional.of(submitted));

        assertThatThrownBy(() -> service.approve(2L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Only owner");
    }
}
