package com.propertymanagement.modules.finance.service;

import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentRepository;
import com.propertymanagement.modules.finance.expense.entity.Expense;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.finance.export.ExportType;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.payroll.entity.PayrollRun;
import com.propertymanagement.modules.hr.payroll.entity.Payslip;
import com.propertymanagement.modules.hr.payroll.repository.PayrollRepository;
import com.propertymanagement.modules.hr.payroll.repository.PayslipRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.vendor.entity.VendorEntity;
import com.propertymanagement.modules.vendor.repository.VendorRepository;
import com.propertymanagement.shared.util.CsvWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FinanceExportService {

    private final RentPaymentRepository rentPaymentRepository;
    private final LeaseContractRepository leaseContractRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final TenantRepository tenantRepository;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final VendorRepository vendorRepository;
    private final PayrollRepository payrollRepository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;

    // PHASE2-DONE: TASK3 — CSV export for rent, expenses, payroll
    @Transactional(readOnly = true)
    public byte[] exportTransactions(LocalDate from, LocalDate to, ExportType type) {
        List<String[]> rows = new ArrayList<>();
        if (type == ExportType.RENT_INCOME || type == ExportType.ALL) {
            if (type == ExportType.ALL) {
                rows.add(new String[]{"=== RENT INCOME ==="});
            }
            rows.add(new String[]{"date", "property", "unit", "tenant", "amount", "payment_method", "contract_id"});
            rows.addAll(rentIncomeRows(from, to));
        }
        if (type == ExportType.EXPENSES || type == ExportType.ALL) {
            if (type == ExportType.ALL) {
                rows.add(new String[]{});
                rows.add(new String[]{"=== EXPENSES ==="});
            }
            rows.add(new String[]{"date", "category", "description", "property", "amount", "vendor", "invoice_ref"});
            rows.addAll(expenseRows(from, to));
        }
        if (type == ExportType.PAYROLL || type == ExportType.ALL) {
            if (type == ExportType.ALL) {
                rows.add(new String[]{});
                rows.add(new String[]{"=== PAYROLL ==="});
            }
            rows.add(new String[]{"month", "employee_name", "base_salary", "allowances", "deductions", "net_salary"});
            rows.addAll(payrollRows(from, to));
        }
        return CsvWriter.toUtf8Bytes(rows);
    }

    @Transactional(readOnly = true)
    public Map<String, Integer> countExportRows(LocalDate from, LocalDate to) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("rentIncome", rentIncomeRows(from, to).size());
        counts.put("expenses", expenseRows(from, to).size());
        counts.put("payroll", payrollRows(from, to).size());
        return counts;
    }

    private List<String[]> rentIncomeRows(LocalDate from, LocalDate to) {
        List<RentPayment> payments = rentPaymentRepository.findByPaymentDateBetweenOrderByPaymentDateAsc(from, to);
        List<String[]> rows = new ArrayList<>();
        for (RentPayment p : payments) {
            LeaseContract contract = p.getContractId() != null
                    ? leaseContractRepository.findById(p.getContractId()).orElse(null) : null;
            String propertyName = contract != null && contract.getPropertyId() != null
                    ? propertyRepository.findById(contract.getPropertyId()).map(Property::getPropertyName).orElse("")
                    : "";
            String unitNumber = contract != null && contract.getUnitId() != null
                    ? unitRepository.findById(contract.getUnitId()).map(Unit::getUnitNumber).orElse("")
                    : "";
            String tenantName = p.getTenantId() != null
                    ? tenantRepository.findById(p.getTenantId()).map(Tenant::getFullName).orElse("")
                    : "";
            rows.add(new String[]{
                    str(p.getPaymentDate()),
                    propertyName,
                    unitNumber,
                    tenantName,
                    str(p.getAmountPaid()),
                    str(p.getPaymentMethod()),
                    contract != null ? str(contract.getId()) : ""
            });
        }
        return rows;
    }

    private List<String[]> expenseRows(LocalDate from, LocalDate to) {
        List<Expense> expenses = expenseWriterRepository.findByExpenseDateBetweenOrderByExpenseDateAsc(from, to);
        List<String[]> rows = new ArrayList<>();
        for (Expense e : expenses) {
            String propertyName = e.getPropertyId() != null
                    ? propertyRepository.findById(e.getPropertyId()).map(Property::getPropertyName).orElse("")
                    : "";
            String vendorName = e.getVendorId() != null
                    ? vendorRepository.findById(e.getVendorId()).map(VendorEntity::getVendorName).orElse("")
                    : "";
            rows.add(new String[]{
                    str(e.getExpenseDate()),
                    str(e.getCategoryId()),
                    str(e.getDescription()),
                    propertyName,
                    str(e.getAmount()),
                    vendorName,
                    str(e.getExpenseNumber())
            });
        }
        return rows;
    }

    private List<String[]> payrollRows(LocalDate from, LocalDate to) {
        List<String[]> rows = new ArrayList<>();
        for (PayrollRun run : payrollRepository.findByPayDateBetweenOrderByPayDateAsc(from, to)) {
            String month = run.getPayPeriodYear() + "-" + String.format("%02d", run.getPayPeriodMonth());
            for (Payslip slip : payslipRepository.findByPayrollRunIdOrderByIdAsc(run.getId())) {
                String employeeName = employeeRepository.findById(slip.getEmployeeId())
                        .map(Employee::getFullName).orElse("");
                BigDecimal allowances = nullSafe(slip.getHousingAllowance())
                        .add(nullSafe(slip.getTransportAllowance()))
                        .add(nullSafe(slip.getOtherAllowances()))
                        .add(nullSafe(slip.getOvertimeAmount()))
                        .add(nullSafe(slip.getBonusAmount()));
                rows.add(new String[]{
                        month,
                        employeeName,
                        str(slip.getBasicSalary()),
                        str(allowances),
                        str(slip.getTotalDeductions()),
                        str(slip.getNetSalary())
                });
            }
        }
        return rows;
    }

    private static BigDecimal nullSafe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }
}
