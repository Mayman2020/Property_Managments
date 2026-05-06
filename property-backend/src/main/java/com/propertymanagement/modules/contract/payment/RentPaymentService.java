package com.propertymanagement.modules.contract.payment;

import com.propertymanagement.modules.contract.lease.LeaseContract;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.dto.AccountantMarkPaidRequest;
import com.propertymanagement.modules.contract.payment.dto.PaymentResponse;
import com.propertymanagement.modules.contract.payment.dto.RecordPaymentDto;
import com.propertymanagement.modules.contract.payment.dto.ReviewPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.contract.payment.dto.UploadPaymentProofRequest;
import com.propertymanagement.modules.notification.NotificationService;
import com.propertymanagement.modules.notification.NotificationType;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import lombok.RequiredArgsConstructor;
import com.propertymanagement.codegen.CodeGenerationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class RentPaymentService {

    private final RentPaymentRepository paymentRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final LeaseContractRepository contractRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final CodeGenerationService codeGenerationService;
    private final NotificationService notificationService;

    public Page<PaymentResponse> getAll(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(this::toResponse);
    }

    public List<PaymentResponse> getByContract(Long contractId) {
        return paymentRepository.findByContractId(contractId).stream().map(this::toResponse).toList();
    }

    public List<ScheduleItemResponse> getSchedule(Long contractId) {
        return scheduleRepository.findByContractId(contractId).stream().map(this::toScheduleResponse).toList();
    }

    public Page<ScheduleItemResponse> getSchedule(Long contractId, Pageable pageable) {
        return scheduleRepository.findByContractIdOrderByDueDateAsc(contractId, pageable).map(this::toScheduleResponse);
    }

    public List<ScheduleItemResponse> getPendingProofs() {
        return scheduleRepository.findByStatusOrderByProofSubmittedAtAsc(PaymentScheduleStatus.PENDING_CONFIRMATION)
                .stream()
                .map(this::toScheduleResponse)
                .toList();
    }

    public List<ScheduleItemResponse> getOverdueSchedule() {
        return scheduleRepository.findByStatusAndDueDateBefore(PaymentScheduleStatus.OVERDUE, LocalDate.now().plusDays(1))
                .stream().map(this::toScheduleResponse).toList();
    }

    @Transactional
    public PaymentResponse recordPayment(RecordPaymentDto dto) {
        String referenceNumber = codeGenerationService.generate("REF");
        RentPayment payment = RentPayment.builder()
                .contractId(dto.getContractId())
                .scheduleId(dto.getScheduleId())
                .tenantId(dto.getTenantId())
                .paymentDate(dto.getPaymentDate())
                .amountPaid(dto.getAmountPaid())
                .amountDue(dto.getAmountDue())
                .paymentMethod(dto.getPaymentMethod())
                .referenceNumber(referenceNumber)
                .receiptUrl(dto.getReceiptUrl())
                .lateFee(dto.getLateFee() != null ? dto.getLateFee() : BigDecimal.ZERO)
                .discount(dto.getDiscount() != null ? dto.getDiscount() : BigDecimal.ZERO)
                .notes(dto.getNotes())
                .recordedBy(currentUserIdOrNull())
                .build();

        RentPayment saved = paymentRepository.save(payment);

        // Update schedule item status
        if (dto.getScheduleId() != null) {
            scheduleRepository.findById(dto.getScheduleId()).ifPresent(schedule -> {
                if (dto.getAmountPaid().compareTo(dto.getAmountDue()) >= 0) {
                    schedule.setStatus(PaymentScheduleStatus.PAID);
                } else {
                    schedule.setStatus(PaymentScheduleStatus.PARTIAL);
                }
                scheduleRepository.save(schedule);
            });
        }

        return toResponse(saved);
    }

    @Transactional
    public ScheduleItemResponse uploadProof(Long scheduleId, Long submittedByUserId, UploadPaymentProofRequest req) {
        RentPaymentSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> com.propertymanagement.shared.exception.AppException.notFound("Payment schedule item not found: " + scheduleId));
        if (schedule.getStatus() == PaymentScheduleStatus.PAID || schedule.getStatus() == PaymentScheduleStatus.WAIVED) {
            throw com.propertymanagement.shared.exception.AppException.badRequest("This payment row is already closed");
        }

        List<String> urls = normalizeProofUrls(req.getProofUrl(), req.getProofUrls());
        if (urls.isEmpty()) {
            throw com.propertymanagement.shared.exception.AppException.badRequest("Payment proof file is required", "PAYMENT_PROOF_FILE_REQUIRED");
        }
        schedule.setProofUrl(urls.get(0));
        schedule.setProofUrls(String.join("\n", urls));
        schedule.setProofPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now());
        schedule.setProofNotes(trimToNull(req.getNotes()));
        schedule.setProofPaymentMethod(trimToNull(req.getPaymentMethod()));
        schedule.setProofReferenceNumber(trimToNull(req.getReferenceNumber()));
        schedule.setProofSubmittedBy(submittedByUserId);
        schedule.setProofSubmittedAt(LocalDateTime.now());
        schedule.setReviewedBy(null);
        schedule.setReviewedAt(null);
        schedule.setRejectionReason(null);
        schedule.setStatus(PaymentScheduleStatus.PENDING_CONFIRMATION);
        RentPaymentSchedule saved = scheduleRepository.save(schedule);

        notifyPaymentSubmitted(saved, submittedByUserId);
        return toScheduleResponse(saved);
    }

    @Transactional
    public ScheduleItemResponse reviewProof(Long scheduleId, ReviewPaymentProofRequest req, Long reviewerUserId) {
        RentPaymentSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> com.propertymanagement.shared.exception.AppException.notFound("Payment schedule item not found: " + scheduleId));
        String status = req.getStatus() == null ? "" : req.getStatus().trim().toUpperCase();
        if ("APPROVED".equals(status) || "PAID".equals(status)) {
            createPaymentFromSchedule(schedule, reviewerUserId, req.getNotes(), schedule.getProofUrl(), false);
            schedule.setStatus(PaymentScheduleStatus.PAID);
            schedule.setReviewedBy(reviewerUserId);
            schedule.setReviewedAt(LocalDateTime.now());
            schedule.setRejectionReason(null);
            RentPaymentSchedule saved = scheduleRepository.save(schedule);
            notifyPaymentAccepted(saved, reviewerUserId);
            return toScheduleResponse(saved);
        }
        if ("REJECTED".equals(status) || "PAYMENT_REJECTED".equals(status)) {
            schedule.setStatus(PaymentScheduleStatus.PAYMENT_REJECTED);
            schedule.setReviewedBy(reviewerUserId);
            schedule.setReviewedAt(LocalDateTime.now());
            schedule.setRejectionReason(trimToNull(req.getNotes()));
            RentPaymentSchedule saved = scheduleRepository.save(schedule);
            notifyPaymentRejected(saved, reviewerUserId);
            return toScheduleResponse(saved);
        }
        throw com.propertymanagement.shared.exception.AppException.badRequest("Unsupported review status: " + req.getStatus());
    }

    @Transactional
    public ScheduleItemResponse markPaidByAccountant(Long scheduleId, AccountantMarkPaidRequest req, Long accountantUserId) {
        RentPaymentSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> com.propertymanagement.shared.exception.AppException.notFound("Payment schedule item not found: " + scheduleId));
        createPaymentFromSchedule(schedule, accountantUserId, req != null ? req.getNotes() : null,
                req != null ? req.getReceiptUrl() : null, true, req);
        schedule.setProofUrl(req != null ? trimToNull(req.getReceiptUrl()) : schedule.getProofUrl());
        schedule.setProofNotes(req != null ? trimToNull(req.getNotes()) : schedule.getProofNotes());
        schedule.setProofPaymentMethod(req != null ? trimToNull(req.getPaymentMethod()) : schedule.getProofPaymentMethod());
        schedule.setProofReferenceNumber(req != null ? trimToNull(req.getReferenceNumber()) : schedule.getProofReferenceNumber());
        schedule.setProofSubmittedBy(accountantUserId);
        schedule.setProofSubmittedAt(LocalDateTime.now());
        schedule.setReviewedBy(accountantUserId);
        schedule.setReviewedAt(LocalDateTime.now());
        schedule.setRejectionReason(null);
        schedule.setStatus(PaymentScheduleStatus.PAID);
        RentPaymentSchedule saved = scheduleRepository.save(schedule);
        notifyPaymentAccepted(saved, accountantUserId);
        return toScheduleResponse(saved);
    }

    private RentPayment createPaymentFromSchedule(RentPaymentSchedule schedule,
                                                  Long recordedBy,
                                                  String notes,
                                                  String receiptUrl,
                                                  boolean manual) {
        return createPaymentFromSchedule(schedule, recordedBy, notes, receiptUrl, manual, null);
    }

    private RentPayment createPaymentFromSchedule(RentPaymentSchedule schedule,
                                                  Long recordedBy,
                                                  String notes,
                                                  String receiptUrl,
                                                  boolean manual,
                                                  AccountantMarkPaidRequest override) {
        if (paymentRepository.findTopByScheduleIdOrderByIdDesc(schedule.getId()).isPresent()) {
            return paymentRepository.findTopByScheduleIdOrderByIdDesc(schedule.getId()).get();
        }
        LeaseContract contract = contractRepository.findById(schedule.getContractId())
                .orElseThrow(() -> com.propertymanagement.shared.exception.AppException.notFound("Lease contract not found: " + schedule.getContractId()));
        BigDecimal amount = override != null && override.getAmountPaid() != null ? override.getAmountPaid() : schedule.getAmount();
        LocalDate paymentDate = override != null && override.getPaymentDate() != null
                ? override.getPaymentDate()
                : (schedule.getProofPaymentDate() != null ? schedule.getProofPaymentDate() : LocalDate.now());
        String method = override != null && override.getPaymentMethod() != null
                ? override.getPaymentMethod()
                : firstNonBlank(schedule.getProofPaymentMethod(), manual ? "CASH" : "BANK_TRANSFER");
        String referenceNumber = firstNonBlank(
                override != null ? override.getReferenceNumber() : null,
                schedule.getProofReferenceNumber(),
                codeGenerationService.generate("REF"));

        RentPayment payment = RentPayment.builder()
                .scheduleId(schedule.getId())
                .contractId(contract.getId())
                .tenantId(contract.getTenantId())
                .paymentDate(paymentDate)
                .amountPaid(amount)
                .amountDue(schedule.getAmount())
                .paymentMethod(method)
                .referenceNumber(referenceNumber)
                .receiptUrl(firstNonBlank(receiptUrl, schedule.getProofUrl()))
                .lateFee(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO)
                .notes(trimToNull(notes))
                .recordedBy(recordedBy)
                .build();
        return paymentRepository.save(payment);
    }

    private PaymentResponse toResponse(RentPayment p) {
        String contractNumber = p.getContractId() != null
                ? contractRepository.findById(p.getContractId())
                    .map(c -> c.getContractNumber()).orElse(null)
                : null;
        String tenantName = p.getTenantId() != null
                ? tenantRepository.findById(p.getTenantId())
                    .map(t -> t.getFullName()).orElse(null)
                : null;

        String recorderName = p.getRecordedBy() != null
                ? userRepository.findById(p.getRecordedBy()).map(User::getFullName).orElse(null)
                : null;

        return PaymentResponse.builder()
                .id(p.getId())
                .scheduleId(p.getScheduleId())
                .contractId(p.getContractId())
                .contractNumber(contractNumber)
                .tenantId(p.getTenantId())
                .tenantName(tenantName)
                .paymentDate(p.getPaymentDate())
                .amountPaid(p.getAmountPaid())
                .amountDue(p.getAmountDue())
                .balance(p.getBalance())
                .paymentMethod(p.getPaymentMethod())
                .referenceNumber(p.getReferenceNumber())
                .receiptUrl(p.getReceiptUrl())
                .lateFee(p.getLateFee())
                .discount(p.getDiscount())
                .notes(p.getNotes())
                .createdAt(p.getCreatedAt())
                .recordedBy(p.getRecordedBy())
                .recordedByName(recorderName)
                .build();
    }

    private ScheduleItemResponse toScheduleResponse(RentPaymentSchedule s) {
        long daysOverdue = s.getStatus() == PaymentScheduleStatus.OVERDUE && s.getDueDate() != null
                ? ChronoUnit.DAYS.between(s.getDueDate(), LocalDate.now())
                : 0;

        Optional<RentPayment> latest = s.getId() != null
                ? paymentRepository.findTopByScheduleIdOrderByIdDesc(s.getId())
                : Optional.empty();

        String receiptUrl = null;
        String settlementNotes = null;
        LocalDate settlementPaymentDate = null;
        String recordedByName = null;
        if (latest.isPresent()) {
            RentPayment p = latest.get();
            receiptUrl = p.getReceiptUrl();
            settlementNotes = p.getNotes();
            settlementPaymentDate = p.getPaymentDate();
            if (p.getRecordedBy() != null) {
                recordedByName = userRepository.findById(p.getRecordedBy()).map(User::getFullName).orElse(null);
            }
        }

        LeaseContract contract = s.getContractId() != null
                ? contractRepository.findById(s.getContractId()).orElse(null)
                : null;
        Tenant tenant = contract != null && contract.getTenantId() != null
                ? tenantRepository.findById(contract.getTenantId()).orElse(null)
                : null;

        return ScheduleItemResponse.builder()
                .id(s.getId())
                .contractId(s.getContractId())
                .contractNumber(contract != null ? contract.getContractNumber() : null)
                .tenantId(contract != null ? contract.getTenantId() : null)
                .tenantName(tenant != null ? tenant.getFullName() : null)
                .dueDate(s.getDueDate())
                .amount(s.getAmount())
                .periodFrom(s.getPeriodFrom())
                .periodTo(s.getPeriodTo())
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .daysOverdue(daysOverdue)
                .createdAt(s.getCreatedAt())
                .receiptUrl(receiptUrl)
                .settlementNotes(settlementNotes)
                .settlementPaymentDate(settlementPaymentDate)
                .recordedByName(recordedByName)
                .proofUrl(s.getProofUrl())
                .proofUrls(parseProofUrls(s.getProofUrls(), s.getProofUrl()))
                .proofPaymentDate(s.getProofPaymentDate())
                .proofNotes(s.getProofNotes())
                .proofPaymentMethod(s.getProofPaymentMethod())
                .proofReferenceNumber(s.getProofReferenceNumber())
                .proofSubmittedBy(s.getProofSubmittedBy())
                .proofSubmittedByName(resolveUserName(s.getProofSubmittedBy()))
                .proofSubmittedAt(s.getProofSubmittedAt())
                .reviewedBy(s.getReviewedBy())
                .reviewedByName(resolveUserName(s.getReviewedBy()))
                .reviewedAt(s.getReviewedAt())
                .rejectionReason(s.getRejectionReason())
                .build();
    }

    private Long currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }

    private String resolveUserName(Long userId) {
        return userId != null ? userRepository.findById(userId).map(User::getFullName).orElse(null) : null;
    }

    private void notifyPaymentSubmitted(RentPaymentSchedule schedule, Long actorUserId) {
        contractRepository.findById(schedule.getContractId()).ifPresent(contract -> {
            List<Long> recipients = collectAccountantAndAdminUserIds(contract.getPropertyId());
            if (recipients.isEmpty()) return;
            notificationService.createLocalized(
                    recipients,
                    actorUserId,
                    contract.getPropertyId(),
                    schedule.getId(),
                    NotificationType.PAYMENT_RECEIVED,
                    "NOTIFICATIONS.PAYMENT_PROOF_SUBMITTED_TITLE",
                    "NOTIFICATIONS.PAYMENT_PROOF_SUBMITTED_BODY",
                    paymentVars(schedule, contract, null),
                    Map.of("contractId", contract.getId(), "scheduleId", schedule.getId()));
        });
    }

    private void notifyPaymentAccepted(RentPaymentSchedule schedule, Long actorUserId) {
        contractRepository.findById(schedule.getContractId()).ifPresent(contract -> {
            tenantRepository.findById(contract.getTenantId()).map(Tenant::getUserId).filter(Objects::nonNull).ifPresent(userId ->
                    notificationService.createLocalized(
                            List.of(userId),
                            actorUserId,
                            contract.getPropertyId(),
                            schedule.getId(),
                            NotificationType.PAYMENT_RECEIVED,
                            "NOTIFICATIONS.PAYMENT_CONFIRMED_TITLE",
                            "NOTIFICATIONS.PAYMENT_CONFIRMED_BODY",
                            paymentVars(schedule, contract, null),
                            Map.of("contractId", contract.getId(), "scheduleId", schedule.getId())));
            List<Long> admins = collectAdminUserIds();
            if (!admins.isEmpty()) {
                notificationService.createLocalized(
                        admins,
                        actorUserId,
                        contract.getPropertyId(),
                        schedule.getId(),
                        NotificationType.PAYMENT_RECEIVED,
                        "NOTIFICATIONS.PAYMENT_CONFIRMED_TITLE",
                        "NOTIFICATIONS.PAYMENT_CONFIRMED_ADMIN_BODY",
                        paymentVars(schedule, contract, null),
                        Map.of("contractId", contract.getId(), "scheduleId", schedule.getId()));
            }
        });
    }

    private void notifyPaymentRejected(RentPaymentSchedule schedule, Long actorUserId) {
        contractRepository.findById(schedule.getContractId()).ifPresent(contract ->
                tenantRepository.findById(contract.getTenantId()).map(Tenant::getUserId).filter(Objects::nonNull).ifPresent(userId ->
                        notificationService.createLocalized(
                                List.of(userId),
                                actorUserId,
                                contract.getPropertyId(),
                                schedule.getId(),
                                NotificationType.PAYMENT_RECEIVED,
                                "NOTIFICATIONS.PAYMENT_REJECTED_TITLE",
                                "NOTIFICATIONS.PAYMENT_REJECTED_BODY",
                                paymentVars(schedule, contract, schedule.getRejectionReason()),
                                Map.of("contractId", contract.getId(), "scheduleId", schedule.getId()))));
    }

    private Map<String, Object> paymentVars(RentPaymentSchedule schedule, LeaseContract contract, String reason) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("dueDate", schedule.getDueDate() != null ? schedule.getDueDate().toString() : "");
        vars.put("amount", schedule.getAmount() != null ? schedule.getAmount().toPlainString() : "0");
        vars.put("reason", firstNonBlank(reason, "-"));
        return vars;
    }

    private List<Long> collectAccountantAndAdminUserIds(Long propertyId) {
        Set<Long> ids = new LinkedHashSet<>(collectAdminUserIds());
        if (propertyId != null) {
            userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT).stream()
                    .map(User::getId).filter(Objects::nonNull).forEach(ids::add);
        }
        userRepository.findByRoleAndActiveTrue(UserRole.ACCOUNTANT).stream()
                .filter(u -> u.getPropertyId() == null)
                .map(User::getId).filter(Objects::nonNull).forEach(ids::add);
        return new ArrayList<>(ids);
    }

    private List<Long> collectAdminUserIds() {
        Set<Long> ids = new LinkedHashSet<>();
        userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream()
                .map(User::getId).filter(Objects::nonNull).forEach(ids::add);
        userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                .map(User::getId).filter(Objects::nonNull).forEach(ids::add);
        return new ArrayList<>(ids);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            String t = trimToNull(v);
            if (t != null) return t;
        }
        return null;
    }

    private List<String> normalizeProofUrls(String proofUrl, List<String> proofUrls) {
        List<String> urls = new ArrayList<>();
        if (proofUrls != null) {
            proofUrls.stream().map(this::trimToNull).filter(Objects::nonNull).forEach(urls::add);
        }
        String single = trimToNull(proofUrl);
        if (single != null && urls.stream().noneMatch(single::equals)) {
            urls.add(0, single);
        }
        return urls.stream().distinct().toList();
    }

    private List<String> parseProofUrls(String proofUrls, String fallbackUrl) {
        List<String> urls = new ArrayList<>();
        if (proofUrls != null && !proofUrls.isBlank()) {
            Arrays.stream(proofUrls.split("\\R"))
                    .map(this::trimToNull)
                    .filter(Objects::nonNull)
                    .forEach(urls::add);
        }
        String fallback = trimToNull(fallbackUrl);
        if (fallback != null && urls.stream().noneMatch(fallback::equals)) {
            urls.add(0, fallback);
        }
        return urls.stream().distinct().toList();
    }
}
