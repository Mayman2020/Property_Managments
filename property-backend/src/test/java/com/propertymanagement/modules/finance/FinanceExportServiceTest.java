package com.propertymanagement.modules.finance;

import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentRepository;
import com.propertymanagement.modules.finance.expense.entity.Expense;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.finance.export.ExportType;
import com.propertymanagement.modules.finance.service.FinanceExportService;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.payroll.entity.PayrollRun;
import com.propertymanagement.modules.hr.payroll.repository.PayrollRepository;
import com.propertymanagement.modules.hr.payroll.repository.PayslipRepository;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.vendor.repository.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceExportServiceTest {

    @Mock RentPaymentRepository rentPaymentRepository;
    @Mock LeaseContractRepository leaseContractRepository;
    @Mock PropertyRepository propertyRepository;
    @Mock UnitRepository unitRepository;
    @Mock TenantRepository tenantRepository;
    @Mock ExpenseWriterRepository expenseWriterRepository;
    @Mock VendorRepository vendorRepository;
    @Mock PayrollRepository payrollRepository;
    @Mock PayslipRepository payslipRepository;
    @Mock EmployeeRepository employeeRepository;

    @InjectMocks FinanceExportService service;

    private final LocalDate from = LocalDate.of(2026, 1, 1);
    private final LocalDate to = LocalDate.of(2026, 1, 31);

    @Test
    void exportTransactions_rentIncome_includesHeaderAndRow() {
        RentPayment payment = RentPayment.builder()
                .id(1L)
                .amountPaid(new BigDecimal("500"))
                .paymentDate(LocalDate.of(2026, 1, 10))
                .build();
        when(rentPaymentRepository.findByPaymentDateBetweenOrderByPaymentDateAsc(from, to))
                .thenReturn(List.of(payment));

        byte[] bytes = service.exportTransactions(from, to, ExportType.RENT_INCOME);
        String csv = new String(bytes, StandardCharsets.UTF_8);

        assertThat(csv).contains("date,property,unit,tenant,amount");
        assertThat(csv).contains("500");
    }

    @Test
    void exportTransactions_expenses_includesHeader() {
        Expense expense = Expense.builder()
                .id(2L)
                .amount(new BigDecimal("120"))
                .expenseDate(LocalDate.of(2026, 1, 5))
                .description("Repair")
                .build();
        when(expenseWriterRepository.findByExpenseDateBetweenOrderByExpenseDateAsc(from, to))
                .thenReturn(List.of(expense));

        byte[] bytes = service.exportTransactions(from, to, ExportType.EXPENSES);
        String csv = new String(bytes, StandardCharsets.UTF_8);

        assertThat(csv).contains("date,category,description,property,amount,vendor,invoice_ref");
        assertThat(csv).contains("120");
    }

    @Test
    void exportTransactions_payroll_includesHeader() {
        PayrollRun run = PayrollRun.builder()
                .id(3L)
                .payDate(LocalDate.of(2026, 1, 25))
                .payPeriodYear(2026)
                .payPeriodMonth(1)
                .build();
        when(payrollRepository.findByPayDateBetweenOrderByPayDateAsc(from, to)).thenReturn(List.of(run));
        when(payslipRepository.findByPayrollRunIdOrderByIdAsc(3L)).thenReturn(Collections.emptyList());

        byte[] bytes = service.exportTransactions(from, to, ExportType.PAYROLL);
        String csv = new String(bytes, StandardCharsets.UTF_8);

        assertThat(csv).contains("month,employee_name,base_salary,allowances,deductions,net_salary");
    }

    @Test
    void countExportRows_returnsCountsPerSection() {
        when(rentPaymentRepository.findByPaymentDateBetweenOrderByPaymentDateAsc(any(), any()))
                .thenReturn(List.of(RentPayment.builder().build()));
        when(expenseWriterRepository.findByExpenseDateBetweenOrderByExpenseDateAsc(any(), any()))
                .thenReturn(Collections.emptyList());
        when(payrollRepository.findByPayDateBetweenOrderByPayDateAsc(any(), any()))
                .thenReturn(Collections.emptyList());

        Map<String, Integer> counts = service.countExportRows(from, to);

        assertThat(counts.get("rentIncome")).isEqualTo(1);
        assertThat(counts.get("expenses")).isEqualTo(0);
        assertThat(counts.get("payroll")).isEqualTo(0);
    }
}
