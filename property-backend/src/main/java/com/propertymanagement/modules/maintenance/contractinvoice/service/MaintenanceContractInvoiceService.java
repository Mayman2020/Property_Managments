package com.propertymanagement.modules.maintenance.contractinvoice.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.finance.expense.entity.Expense;
import com.propertymanagement.modules.finance.expense.repository.ExpenseCategoryLookupRepository;
import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceContractInvoiceResponse;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceContractInvoicePaymentResponse;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceInvoiceInstallmentPaymentRequest;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceInvoicePaymentPlanRequest;
import com.propertymanagement.modules.maintenance.contractinvoice.entity.MaintenanceContractInvoicePayment;
import com.propertymanagement.modules.maintenance.contractinvoice.repository.MaintenanceContractInvoicePaymentRepository;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.contractinvoice.entity.MaintenanceContractInvoice;
import com.propertymanagement.modules.maintenance.contractinvoice.repository.MaintenanceContractInvoiceRepository;

@Service
@RequiredArgsConstructor
public class MaintenanceContractInvoiceService {
    private static final String MAINTENANCE_EXPENSE_CODE = "MAINT-LABOR";

    private final MaintenanceContractInvoiceRepository invoiceRepo;
    private final MaintenanceContractRepository contractRepo;
    private final ContractorCompanyRepository companyRepo;
    private final ExpenseWriterRepository expenseWriterRepository;
    private final ExpenseCategoryLookupRepository expenseCategoryLookupRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepo;
    private final OwnerRepository ownerRepo;
    private final MaintenanceContractInvoicePaymentRepository paymentRepo;

    // ── List all invoices (admin) ─────────────────────────────────────────
    public List<MaintenanceContractInvoiceResponse> listAll() {
        return invoiceRepo.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Get single invoice ────────────────────────────────────────────────
    public MaintenanceContractInvoiceResponse getById(Long id) {
        return toResponse(requireInvoice(id));
    }

    // ── List by contract ──────────────────────────────────────────────────
    public List<MaintenanceContractInvoiceResponse> listByContract(Long contractId) {
        return invoiceRepo.findByContractIdOrderByInvoiceYearAscInvoiceMonthAsc(contractId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Generate monthly invoices for a contract ──────────────────────────
    @Transactional
    public List<MaintenanceContractInvoiceResponse> generateMonthlyInvoices(Long contractId) {
        MaintenanceContract contract = requireContractActive(contractId);

        if (contract.getContractValue() == null) {
            throw AppException.badRequest("Contract must have a contract value to generate invoices");
        }
        if (contract.getStartDate() == null || contract.getEndDate() == null) {
            throw AppException.badRequest("Contract must have both start and end dates to generate invoices");
        }

        BigDecimal monthlyAmount = contract.getContractValue()
                .divide(BigDecimal.valueOf(12), 3, RoundingMode.HALF_UP);

        LocalDate cursor = contract.getStartDate().withDayOfMonth(1);
        LocalDate contractEnd = contract.getEndDate();

        List<MaintenanceContractInvoice> created = new ArrayList<>();

        while (!cursor.isAfter(contractEnd)) {
            int month = cursor.getMonthValue();
            int year  = cursor.getYear();

            if (!invoiceRepo.existsByContractIdAndInvoiceMonthAndInvoiceYear(contractId, month, year)) {
                LocalDate dueDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1); // last day of month
                String invoiceNumber = generateInvoiceNumber(year, month);

                MaintenanceContractInvoice invoice = MaintenanceContractInvoice.builder()
                        .invoiceNumber(invoiceNumber)
                        .contractId(contractId)
                        .contractorCompanyId(contract.getContractorCompanyId())
                        .propertyId(contract.getPropertyId())
                        .invoiceMonth(month)
                        .invoiceYear(year)
                        .amount(monthlyAmount)
                        .dueDate(dueDate)
                        .status("DRAFT")
                        .descriptionAr(maintenanceInvoiceDescriptionAr(invoiceNumber))
                        .descriptionEn(maintenanceInvoiceDescriptionEn(invoiceNumber))
                        .build();

                created.add(invoiceRepo.save(invoice));
            }

            cursor = cursor.plusMonths(1);
        }

        return created.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Mark invoice paid ─────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractInvoiceResponse markPaid(Long id, String receiptUrl, String notes) {
        return createPaymentPlan(id, new MaintenanceInvoicePaymentPlanRequest(
                "FULL",
                receiptUrl,
                notes,
                1,
                List.of(new MaintenanceInvoicePaymentPlanRequest.InstallmentDueDateRequest(1, LocalDate.now()))));
    }

    @Transactional
    public MaintenanceContractInvoiceResponse createPaymentPlan(Long id, MaintenanceInvoicePaymentPlanRequest request) {
        MaintenanceContractInvoice invoice = requireInvoice(id);
        if ("CANCELLED".equals(invoice.getStatus())) {
            throw AppException.badRequest("Cannot pay a cancelled invoice");
        }
        if ("PAID".equals(invoice.getStatus())) {
            throw AppException.badRequest("Invoice is already paid");
        }
        if (paymentRepo.existsByInvoiceId(invoice.getId())) {
            throw AppException.badRequest("This invoice already has a payment plan");
        }

        String mode = request == null || request.mode() == null ? "FULL" : request.mode().trim().toUpperCase();
        if ("SCHEDULED".equals(mode)) {
            createScheduledPayments(invoice, request);
        } else {
            createFullPayment(invoice, request);
        }

        invoiceRepo.save(invoice);
        syncMasterPendingExpense(invoice);
        notifyPaymentPlanCreated(invoice);
        return toResponse(invoice);
    }

    @Transactional
    public MaintenanceContractInvoiceResponse markInstallmentPaid(Long invoiceId, Long paymentId,
                                                                  MaintenanceInvoiceInstallmentPaymentRequest request) {
        MaintenanceContractInvoice invoice = requireInvoice(invoiceId);
        MaintenanceContractInvoicePayment payment = paymentRepo.findByInvoiceIdAndId(invoiceId, paymentId)
                .orElseThrow(() -> AppException.notFound("Payment installment not found"));
        if ("CANCELLED".equals(invoice.getStatus()) || "CANCELLED".equals(payment.getStatus())) {
            throw AppException.badRequest("Cannot pay a cancelled installment");
        }
        if ("PAID".equals(payment.getStatus())) {
            throw AppException.badRequest("Installment is already paid");
        }
        String receiptUrl = request == null ? null : request.receiptUrl();
        if (receiptUrl == null || receiptUrl.isBlank()) {
            throw AppException.badRequest("Receipt attachment is required");
        }

        payment.setStatus("PAID");
        payment.setPaidDate(LocalDate.now());
        payment.setReceiptUrl(receiptUrl.trim());
        payment.setNotes(appendNote(payment.getNotes(), request.notes()));
        paymentRepo.save(payment);
        createPropertyExpense(invoice, payment);
        syncInvoicePaymentStatus(invoice);
        invoice.setNotes(appendNote(invoice.getNotes(), request.notes()));
        invoiceRepo.save(invoice);
        syncMasterPendingExpense(invoice);
        notifyPaymentReceived(invoice, payment);
        return toResponse(invoice);
    }

    @Transactional
    public int notifyInstallmentsDueSoon(LocalDate dueDate) {
        List<MaintenanceContractInvoicePayment> payments =
                paymentRepo.findByStatusAndDueDateAndReminder3dSentAtIsNull("PENDING", dueDate);
        payments.forEach(payment -> {
            MaintenanceContractInvoice invoice = requireInvoice(payment.getInvoiceId());
            notifyAccountants(invoice, payment, NotificationType.MAINTENANCE_CONTRACT_PAYMENT_DUE_SOON);
            payment.setReminder3dSentAt(LocalDateTime.now());
            paymentRepo.save(payment);
        });
        return payments.size();
    }

    @Transactional
    public int notifyInstallmentsDueToday(LocalDate dueDate) {
        List<MaintenanceContractInvoicePayment> payments =
                paymentRepo.findByStatusAndDueDateAndDueTodaySentAtIsNull("PENDING", dueDate);
        payments.forEach(payment -> {
            MaintenanceContractInvoice invoice = requireInvoice(payment.getInvoiceId());
            notifyAccountants(invoice, payment, NotificationType.MAINTENANCE_CONTRACT_PAYMENT_DUE_TODAY);
            payment.setDueTodaySentAt(LocalDateTime.now());
            paymentRepo.save(payment);
        });
        return payments.size();
    }

    // ── Cancel invoice ────────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractInvoiceResponse cancel(Long id) {
        MaintenanceContractInvoice invoice = requireInvoice(id);
        if ("PAID".equals(invoice.getStatus())) {
            throw AppException.badRequest("Cannot cancel a paid invoice");
        }
        invoice.setStatus("CANCELLED");
        invoiceRepo.save(invoice);
        return toResponse(invoice);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private MaintenanceContractInvoice requireInvoice(Long id) {
        return invoiceRepo.findById(id)
                .orElseThrow(() -> AppException.notFound("Invoice not found with id " + id));
    }

    private MaintenanceContract requireContractActive(Long contractId) {
        MaintenanceContract c = contractRepo.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found with id " + contractId));
        if (!"ACTIVE".equals(c.getStatus())) {
            throw AppException.badRequest("Invoices can only be generated for active contracts");
        }
        return c;
    }

    private String generateInvoiceNumber(int year, int month) {
        long seq = invoiceRepo.count() + 1;
        String candidate = String.format("MCI-%d-%02d-%05d", year, month, seq);
        while (invoiceRepo.existsByInvoiceNumber(candidate)) {
            seq++;
            candidate = String.format("MCI-%d-%02d-%05d", year, month, seq);
        }
        return candidate;
    }

    MaintenanceContractInvoiceResponse toResponse(MaintenanceContractInvoice inv) {
        String contractNumber = contractRepo.findById(inv.getContractId())
                .map(MaintenanceContract::getContractNumber).orElse(null);

        String companyName = null, companyNameAr = null, companyNameEn = null;
        ContractorCompanyEntity company = companyRepo.findById(inv.getContractorCompanyId()).orElse(null);
        if (company != null) {
            companyName   = company.getName();
            companyNameAr = company.getNameAr();
            companyNameEn = company.getNameEn();
        }

        List<MaintenanceContractInvoicePayment> payments = paymentRepo.findByInvoiceIdOrderByInstallmentNoAsc(inv.getId());
        BigDecimal paidAmount = payments.stream()
                .filter(p -> "PAID".equals(p.getStatus()))
                .map(MaintenanceContractInvoicePayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remainingAmount = inv.getAmount() == null ? BigDecimal.ZERO : inv.getAmount().subtract(paidAmount);
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) remainingAmount = BigDecimal.ZERO;
        long paidCount = payments.stream().filter(p -> "PAID".equals(p.getStatus())).count();

        return new MaintenanceContractInvoiceResponse(
                inv.getId(), inv.getInvoiceNumber(),
                inv.getContractId(), contractNumber,
                inv.getContractorCompanyId(), companyName, companyNameAr, companyNameEn,
                inv.getPropertyId(),
                inv.getInvoiceMonth(), inv.getInvoiceYear(),
                inv.getAmount(), inv.getDueDate(), inv.getPaidDate(), inv.getReceiptUrl(),
                inv.getStatus(), inv.getNotes(),
                firstNonBlank(inv.getDescriptionAr(), maintenanceInvoiceDescriptionAr(inv.getInvoiceNumber())),
                firstNonBlank(inv.getDescriptionEn(), maintenanceInvoiceDescriptionEn(inv.getInvoiceNumber())),
                inv.getCreatedAt(),
                payments.stream().map(this::toPaymentResponse).toList(),
                paidAmount.setScale(2, RoundingMode.HALF_UP),
                remainingAmount.setScale(2, RoundingMode.HALF_UP),
                payments.size(),
                (int) paidCount
        );
    }

    private void createFullPayment(MaintenanceContractInvoice invoice, MaintenanceInvoicePaymentPlanRequest request) {
        String receiptUrl = request == null ? null : request.receiptUrl();
        if (receiptUrl == null || receiptUrl.isBlank()) {
            throw AppException.badRequest("Receipt attachment is required");
        }
        MaintenanceContractInvoicePayment payment = MaintenanceContractInvoicePayment.builder()
                .invoiceId(invoice.getId())
                .installmentNo(1)
                .amount(invoice.getAmount())
                .dueDate(LocalDate.now())
                .paidDate(LocalDate.now())
                .receiptUrl(receiptUrl.trim())
                .status("PAID")
                .notes(request.notes())
                .build();
        paymentRepo.save(payment);
        invoice.setStatus("PAID");
        invoice.setPaidDate(LocalDate.now());
        invoice.setReceiptUrl(receiptUrl.trim());
        invoice.setNotes(appendNote(invoice.getNotes(), request.notes()));
        createPropertyExpense(invoice, payment);
        notifyPaymentReceived(invoice, payment);
    }

    private void createScheduledPayments(MaintenanceContractInvoice invoice, MaintenanceInvoicePaymentPlanRequest request) {
        int count = request == null || request.installmentCount() == null ? 0 : request.installmentCount();
        if (count < 1 || count > 4) {
            throw AppException.badRequest("Installment count must be from 1 to 4");
        }
        String receiptUrl = request.receiptUrl();
        if (receiptUrl == null || receiptUrl.isBlank()) {
            throw AppException.badRequest("Receipt attachment is required for the first installment");
        }
        Map<Integer, LocalDate> dueDates = new LinkedHashMap<>();
        if (request.installments() != null) {
            for (MaintenanceInvoicePaymentPlanRequest.InstallmentDueDateRequest installment : request.installments()) {
                if (installment.installmentNo() != null && installment.dueDate() != null) {
                    dueDates.put(installment.installmentNo(), installment.dueDate());
                }
            }
        }

        BigDecimal total = invoice.getAmount() == null ? BigDecimal.ZERO : invoice.getAmount();
        BigDecimal base = total.divide(BigDecimal.valueOf(count), 3, RoundingMode.DOWN);
        BigDecimal allocated = BigDecimal.ZERO;
        LocalDate today = LocalDate.now();
        for (int i = 1; i <= count; i++) {
            BigDecimal amount = i == count ? total.subtract(allocated) : base;
            allocated = allocated.add(amount);
            LocalDate dueDate = i == 1 ? today : dueDates.get(i);
            if (dueDate == null) {
                throw AppException.badRequest("Due date is required for installment " + i);
            }
            if (i > 1 && dueDate.isBefore(today.plusDays(1))) {
                throw AppException.badRequest("Future installments must have a future due date");
            }
            MaintenanceContractInvoicePayment payment = MaintenanceContractInvoicePayment.builder()
                    .invoiceId(invoice.getId())
                    .installmentNo(i)
                    .amount(amount)
                    .dueDate(dueDate)
                    .paidDate(i == 1 ? today : null)
                    .receiptUrl(i == 1 ? receiptUrl.trim() : null)
                    .status(i == 1 ? "PAID" : "PENDING")
                    .notes(i == 1 ? request.notes() : null)
                    .build();
            paymentRepo.save(payment);
            if (i == 1) {
                createPropertyExpense(invoice, payment);
                notifyPaymentReceived(invoice, payment);
            }
        }
        if (count == 1) {
            invoice.setStatus("PAID");
            invoice.setPaidDate(today);
            invoice.setReceiptUrl(receiptUrl.trim());
        } else {
            invoice.setStatus("ISSUED");
            invoice.setPaidDate(null);
            invoice.setReceiptUrl(receiptUrl.trim());
        }
        invoice.setNotes(appendNote(invoice.getNotes(), request.notes()));
    }

    private MaintenanceContractInvoicePaymentResponse toPaymentResponse(MaintenanceContractInvoicePayment payment) {
        return new MaintenanceContractInvoicePaymentResponse(
                payment.getId(),
                payment.getInvoiceId(),
                payment.getInstallmentNo(),
                payment.getAmount(),
                payment.getDueDate(),
                payment.getPaidDate(),
                payment.getReceiptUrl(),
                payment.getStatus(),
                payment.getNotes()
        );
    }

    private void createPropertyExpense(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment) {
        String expenseNumber = generateExpenseNumber(invoice, payment);
        Expense expense = expenseWriterRepository.findByExpenseNumber(expenseNumber)
                .orElseGet(() -> Expense.builder()
                        .expenseNumber(expenseNumber)
                        .propertyId(invoice.getPropertyId())
                        .categoryId(maintenanceExpenseCategoryId())
                        .description(maintenanceInstallmentDescriptionAr(invoice, payment))
                        .descriptionAr(maintenanceInstallmentDescriptionAr(invoice, payment))
                        .descriptionEn(maintenanceInstallmentDescriptionEn(invoice, payment))
                        .createdAt(LocalDateTime.now())
                        .build());
        expense.setPropertyId(invoice.getPropertyId());
        expense.setCategoryId(maintenanceExpenseCategoryId());
        expense.setDescription(maintenanceInstallmentDescriptionAr(invoice, payment));
        expense.setDescriptionAr(maintenanceInstallmentDescriptionAr(invoice, payment));
        expense.setDescriptionEn(maintenanceInstallmentDescriptionEn(invoice, payment));
        expense.setAmount(payment.getAmount().setScale(2, RoundingMode.HALF_UP));
        expense.setCurrency("OMR");
        expense.setExpenseDate(payment.getPaidDate() != null ? payment.getPaidDate() : LocalDate.now());
        expense.setStatus("PAID");
        expenseWriterRepository.save(expense);
    }

    private void syncMasterPendingExpense(MaintenanceContractInvoice invoice) {
        BigDecimal remaining = calculateRemainingAmount(invoice);
        String expenseNumber = generateExpenseNumber(invoice);
        Expense expense = expenseWriterRepository.findByExpenseNumber(expenseNumber)
                .orElseGet(() -> Expense.builder()
                        .expenseNumber(expenseNumber)
                        .propertyId(invoice.getPropertyId())
                        .categoryId(maintenanceExpenseCategoryId())
                        .description(maintenanceInvoiceDescriptionAr(invoice.getInvoiceNumber()))
                        .descriptionAr(maintenanceInvoiceDescriptionAr(invoice.getInvoiceNumber()))
                        .descriptionEn(maintenanceInvoiceDescriptionEn(invoice.getInvoiceNumber()))
                        .createdAt(LocalDateTime.now())
                        .build());
        expense.setPropertyId(invoice.getPropertyId());
        expense.setCategoryId(maintenanceExpenseCategoryId());
        expense.setDescription(maintenanceInvoiceDescriptionAr(invoice.getInvoiceNumber()));
        expense.setDescriptionAr(maintenanceInvoiceDescriptionAr(invoice.getInvoiceNumber()));
        expense.setDescriptionEn(maintenanceInvoiceDescriptionEn(invoice.getInvoiceNumber()));
        expense.setAmount(remaining.setScale(2, RoundingMode.HALF_UP));
        expense.setCurrency("OMR");
        expense.setExpenseDate(nextPendingPaymentDate(invoice));
        expense.setStatus(remaining.compareTo(BigDecimal.ZERO) > 0 ? "PENDING" : "PAID");
        expenseWriterRepository.save(expense);
    }

    private void syncInvoicePaymentStatus(MaintenanceContractInvoice invoice) {
        BigDecimal remaining = calculateRemainingAmount(invoice);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setStatus("PAID");
            invoice.setPaidDate(LocalDate.now());
        } else {
            invoice.setStatus("ISSUED");
            invoice.setPaidDate(null);
        }
    }

    private BigDecimal calculateRemainingAmount(MaintenanceContractInvoice invoice) {
        BigDecimal paid = paymentRepo.findByInvoiceIdOrderByInstallmentNoAsc(invoice.getId()).stream()
                .filter(payment -> "PAID".equals(payment.getStatus()))
                .map(MaintenanceContractInvoicePayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = invoice.getAmount() == null ? BigDecimal.ZERO : invoice.getAmount();
        BigDecimal remaining = total.subtract(paid);
        return remaining.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : remaining;
    }

    private LocalDate nextPendingPaymentDate(MaintenanceContractInvoice invoice) {
        return paymentRepo.findByInvoiceIdOrderByInstallmentNoAsc(invoice.getId()).stream()
                .filter(payment -> "PENDING".equals(payment.getStatus()))
                .map(MaintenanceContractInvoicePayment::getDueDate)
                .findFirst()
                .orElse(invoice.getPaidDate() != null ? invoice.getPaidDate() : LocalDate.now());
    }

    private void notifyPaymentPlanCreated(MaintenanceContractInvoice invoice) {
        notifyStakeholders(invoice, null, NotificationType.MAINTENANCE_CONTRACT_PAYMENT_SCHEDULED);
    }

    private void notifyPaymentReceived(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment) {
        notifyStakeholders(invoice, payment, NotificationType.MAINTENANCE_CONTRACT_PAYMENT_RECEIVED);
    }

    private void notifyStakeholders(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment, NotificationType type) {
        MaintenanceContract contract = contractRepo.findById(invoice.getContractId())
                .orElseThrow(() -> AppException.notFound("Contract not found with id " + invoice.getContractId()));

        List<Long> recipients = new ArrayList<>();
        recipients.addAll(userRepo.findActiveContractorStaffForProperty(contract.getPropertyId(), contract.getContractorCompanyId())
                .stream().map(User::getId).distinct().collect(Collectors.toList()));
        List<Long> ownerIds = ownerRepo.findActiveLinkedToPropertyId(contract.getPropertyId(), Pageable.unpaged())
                .stream().map(owner -> owner.getId()).toList();
        if (!ownerIds.isEmpty()) {
            recipients.addAll(ownerRepo.findPortalUserIdsByOwnerIds(ownerIds));
        }
        recipients = recipients.stream().distinct().toList();
        if (recipients.isEmpty()) {
            return;
        }

        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("invoiceNumber", invoice.getInvoiceNumber());
        vars.put("contractNumber", contract.getContractNumber());
        vars.put("amount", payment != null ? payment.getAmount() : invoice.getAmount());
        vars.put("invoiceMonth", invoice.getInvoiceMonth());
        vars.put("invoiceYear", invoice.getInvoiceYear());
        vars.put("installmentNo", payment != null ? payment.getInstallmentNo() : null);
        vars.put("dueDate", payment != null ? payment.getDueDate() : invoice.getDueDate());

        Map<String, Object> hints = new LinkedHashMap<>();
        hints.put("maintenanceContractId", contract.getId());
        hints.put("invoiceId", invoice.getId());
        if (payment != null) {
            hints.put("paymentId", payment.getId());
        }

        notificationService.createLocalized(
                recipients,
                null,
                contract.getPropertyId(),
                null,
                type,
                notificationTitleKey(type),
                notificationBodyKey(type),
                vars,
                hints);
    }

    private void notifyAccountants(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment, NotificationType type) {
        List<Long> recipients = userRepo.findActiveAccountantUserIdsForProperty(invoice.getPropertyId())
                .stream().distinct().toList();
        if (recipients.isEmpty()) {
            return;
        }
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("invoiceNumber", invoice.getInvoiceNumber());
        vars.put("amount", payment.getAmount());
        vars.put("installmentNo", payment.getInstallmentNo());
        vars.put("dueDate", payment.getDueDate());
        Map<String, Object> hints = new LinkedHashMap<>();
        hints.put("invoiceId", invoice.getId());
        hints.put("paymentId", payment.getId());
        notificationService.createLocalized(recipients, null, invoice.getPropertyId(), null, type,
                notificationTitleKey(type), notificationBodyKey(type), vars, hints);
    }

    private String notificationTitleKey(NotificationType type) {
        return "NOTIFICATIONS.TYPES." + type.name() + ".TITLE";
    }

    private String notificationBodyKey(NotificationType type) {
        return "NOTIFICATIONS.TYPES." + type.name() + ".BODY";
    }

    private String generateExpenseNumber(MaintenanceContractInvoice invoice) {
        return "EXP-MC-" + invoice.getInvoiceNumber();
    }

    private String generateExpenseNumber(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment) {
        return generateExpenseNumber(invoice) + "-P" + payment.getInstallmentNo();
    }

    private Long maintenanceExpenseCategoryId() {
        return expenseCategoryLookupRepository.findByCategoryCode(MAINTENANCE_EXPENSE_CODE)
                .map(com.propertymanagement.modules.finance.expense.entity.ExpenseCategory::getId)
                .orElse(null);
    }

    private String appendNote(String existing, String note) {
        if (note == null || note.isBlank()) return existing;
        if (existing == null || existing.isBlank()) return note.trim();
        return existing + "\n" + note.trim();
    }

    private String maintenanceInvoiceDescriptionAr(String invoiceNumber) {
        return "فاتورة عقد صيانة" + (invoiceNumber == null || invoiceNumber.isBlank() ? "" : " " + invoiceNumber);
    }

    private String maintenanceInvoiceDescriptionEn(String invoiceNumber) {
        return "Maintenance contract invoice" + (invoiceNumber == null || invoiceNumber.isBlank() ? "" : " " + invoiceNumber);
    }

    private String maintenanceInstallmentDescriptionAr(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment) {
        return maintenanceInvoiceDescriptionAr(invoice.getInvoiceNumber()) + " - الدفعة " + payment.getInstallmentNo();
    }

    private String maintenanceInstallmentDescriptionEn(MaintenanceContractInvoice invoice, MaintenanceContractInvoicePayment payment) {
        return maintenanceInvoiceDescriptionEn(invoice.getInvoiceNumber()) + " - installment " + payment.getInstallmentNo();
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return null;
    }
}
