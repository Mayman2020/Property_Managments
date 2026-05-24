package com.propertymanagement.modules.contract.payment.service;

import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.dto.AccountantMarkPaidRequest;
import com.propertymanagement.modules.contract.payment.dto.PaymentResponse;
import com.propertymanagement.modules.contract.payment.dto.RecordPaymentDto;
import com.propertymanagement.modules.contract.payment.dto.ReviewPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.contract.payment.dto.UploadPaymentProofRequest;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.ownerportal.service.OwnerRevenueShareService;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.shared.config.LateFeeProperties;
import com.propertymanagement.shared.security.PropertyScopeService;
import com.propertymanagement.modules.finance.revenue.entity.OtherRevenue;
import com.propertymanagement.modules.finance.revenue.repository.OtherRevenueWriterRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import com.propertymanagement.codegen.CodeGenerationService;
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
import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentRepository;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;

@Service
@RequiredArgsConstructor
public class RentPaymentService {

    private final RentPaymentRepository paymentRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final LeaseContractRepository contractRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final UnitRepository unitRepository;
    private final PropertyRepository propertyRepository;
    private final OtherRevenueWriterRepository revenueWriterRepository;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final CodeGenerationService codeGenerationService;
    private final NotificationService notificationService;
    private final PropertyScopeService propertyScopeService;
    private final LateFeeProperties lateFeeProperties;
    private final OwnerRevenueShareService ownerRevenueShareService;

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

    public List<ScheduleItemResponse> getOverdueSchedule(Long propertyId) {
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        LocalDate cutoff = LocalDate.now().plusDays(1);
        List<RentPaymentSchedule> rows;
        if (scope != null) {
            if (scope.isEmpty()) {
                return List.of();
            }
            if (propertyId != null) {
                rows = scope.contains(propertyId)
                        ? scheduleRepository.findActiveContractOverdueByProperty(PaymentScheduleStatus.OVERDUE, cutoff, propertyId)
                        : List.of();
            } else {
                rows = scheduleRepository.findActiveContractOverdueInProperties(PaymentScheduleStatus.OVERDUE, cutoff, scope);
            }
        } else if (propertyId != null) {
            rows = scheduleRepository.findActiveContractOverdueByProperty(PaymentScheduleStatus.OVERDUE, cutoff, propertyId);
        } else {
            rows = scheduleRepository.findActiveContractOverdue(PaymentScheduleStatus.OVERDUE, cutoff);
        }
        return rows.stream().map(this::toScheduleResponse).toList();
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
        contractRepository.findById(dto.getContractId())
                .map(LeaseContract::getPropertyId)
                .ifPresent(propertyId -> ownerRevenueShareService.allocateShares(saved, propertyId));

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
            if (schedule.getStatus() != PaymentScheduleStatus.PENDING_CONFIRMATION) {
                throw com.propertymanagement.shared.exception.AppException.badRequest("Payment proof is not pending review");
            }
            RentPayment payment = createPaymentFromSchedule(schedule, reviewerUserId, req.getNotes(), schedule.getProofUrl(), false);
            schedule.setStatus(PaymentScheduleStatus.PAID);
            schedule.setReviewedBy(reviewerUserId);
            schedule.setReviewedAt(LocalDateTime.now());
            schedule.setRejectionReason(null);
            RentPaymentSchedule saved = scheduleRepository.save(schedule);
            createRentRevenueIfMissing(saved, payment);
            notifyPaymentAccepted(saved, reviewerUserId);
            return toScheduleResponse(saved);
        }
        if ("REJECTED".equals(status) || "PAYMENT_REJECTED".equals(status)) {
            if (schedule.getStatus() != PaymentScheduleStatus.PENDING_CONFIRMATION) {
                throw com.propertymanagement.shared.exception.AppException.badRequest("Payment proof is not pending review");
            }
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
        if (schedule.getStatus() == PaymentScheduleStatus.PAID || schedule.getStatus() == PaymentScheduleStatus.WAIVED) {
            throw com.propertymanagement.shared.exception.AppException.badRequest("This payment row is already closed");
        }
        RentPayment payment = createPaymentFromSchedule(schedule, accountantUserId, req != null ? req.getNotes() : null,
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
        createRentRevenueIfMissing(saved, payment);
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
        LeaseContract contract = contractRepository.findById(schedule.getContractId())
                .orElseThrow(() -> com.propertymanagement.shared.exception.AppException.notFound("Lease contract not found: " + schedule.getContractId()));
        var existingOpt = paymentRepository.findTopByScheduleIdOrderByIdDesc(schedule.getId());
        if (existingOpt.isPresent()) {
            RentPayment existing = existingOpt.get();
            if (contract.getPropertyId() != null) {
                ownerRevenueShareService.allocateShares(existing, contract.getPropertyId());
            }
            return existing;
        }
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
        RentPayment saved = paymentRepository.save(payment);
        if (contract.getPropertyId() != null) {
            ownerRevenueShareService.allocateShares(saved, contract.getPropertyId());
        }
        return saved;
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
        com.propertymanagement.modules.unit.entity.Unit unit = contract != null && contract.getUnitId() != null
                ? unitRepository.findById(contract.getUnitId()).orElse(null)
                : null;
        com.propertymanagement.modules.property.entity.Property property = contract != null && contract.getPropertyId() != null
                ? propertyRepository.findById(contract.getPropertyId()).orElse(null)
                : null;

        return ScheduleItemResponse.builder()
                .id(s.getId())
                .contractId(s.getContractId())
                .contractNumber(contract != null ? contract.getContractNumber() : null)
                .tenantId(contract != null ? contract.getTenantId() : null)
                .tenantName(tenant != null ? tenant.getFullName() : null)
                .unitId(unit != null ? unit.getId() : null)
                .unitNumber(unit != null ? unit.getUnitNumber() : null)
                .propertyId(property != null ? property.getId() : null)
                .propertyNameAr(property != null ? (property.getPropertyNameAr() != null ? property.getPropertyNameAr() : property.getPropertyName()) : null)
                .propertyNameEn(property != null ? (property.getPropertyNameEn() != null ? property.getPropertyNameEn() : property.getPropertyName()) : null)
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
                    null,
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
                            null,
                            NotificationType.PAYMENT_RECEIVED,
                            "NOTIFICATIONS.PAYMENT_CONFIRMED_TITLE",
                            "NOTIFICATIONS.PAYMENT_CONFIRMED_BODY",
                            paymentVars(schedule, contract, null),
                            Map.of("contractId", contract.getId(), "scheduleId", schedule.getId())));
            List<Long> owners = propertyOwnerPortalRecipientService.portalRecipientUserIds(contract.getPropertyId());
            if (!owners.isEmpty()) {
                notificationService.createLocalized(
                        owners,
                        actorUserId,
                        contract.getPropertyId(),
                        null,
                        NotificationType.PAYMENT_RECEIVED,
                        "NOTIFICATIONS.PAYMENT_CONFIRMED_TITLE",
                        "NOTIFICATIONS.PAYMENT_CONFIRMED_OWNER_BODY",
                        paymentVars(schedule, contract, null),
                        Map.of("contractId", contract.getId(), "scheduleId", schedule.getId()));
            }
            List<Long> admins = collectAdminUserIds();
            if (!admins.isEmpty()) {
                notificationService.createLocalized(
                        admins,
                        actorUserId,
                        contract.getPropertyId(),
                        null,
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
                                null,
                                NotificationType.PAYMENT_RECEIVED,
                                "NOTIFICATIONS.PAYMENT_REJECTED_TITLE",
                                "NOTIFICATIONS.PAYMENT_REJECTED_BODY",
                                paymentVars(schedule, contract, schedule.getRejectionReason()),
                                Map.of("contractId", contract.getId(), "scheduleId", schedule.getId()))));
    }

    public void notifyUpcomingRentDue(RentPaymentSchedule schedule) {
        contractRepository.findById(schedule.getContractId()).ifPresent(contract -> {
            tenantRepository.findById(contract.getTenantId()).map(Tenant::getUserId).filter(Objects::nonNull).ifPresent(userId ->
                    notificationService.createLocalized(
                            List.of(userId),
                            null,
                            contract.getPropertyId(),
                            null,
                            NotificationType.RENT_DUE,
                            "NOTIFICATIONS.RENT_DUE_TITLE",
                            "NOTIFICATIONS.RENT_DUE_BODY",
                            paymentVars(schedule, contract, null, null),
                            Map.of("contractId", contract.getId(), "scheduleId", schedule.getId())));
        });
    }

    // PHASE1-DONE: TASK1 RENT_OVERDUE — tenant + accountants when schedule is overdue
    public void notifyRentOverdue(RentPaymentSchedule schedule, BigDecimal lateFee) {
        contractRepository.findById(schedule.getContractId()).ifPresent(contract -> {
            Map<String, Object> vars = paymentVars(schedule, contract, null, lateFee);
            Map<String, Object> nav = Map.of("contractId", contract.getId(), "scheduleId", schedule.getId());
            tenantRepository.findById(contract.getTenantId()).map(Tenant::getUserId).filter(Objects::nonNull).ifPresent(userId ->
                    notificationService.createLocalized(
                            List.of(userId),
                            null,
                            contract.getPropertyId(),
                            null,
                            NotificationType.RENT_OVERDUE,
                            "NOTIFICATIONS.RENT_OVERDUE_TITLE",
                            "NOTIFICATIONS.RENT_OVERDUE_BODY",
                            vars,
                            nav));
            List<Long> staff = collectAccountantAndAdminUserIds(contract.getPropertyId());
            if (!staff.isEmpty()) {
                notificationService.createLocalized(
                        staff,
                        null,
                        contract.getPropertyId(),
                        null,
                        NotificationType.RENT_OVERDUE,
                        "NOTIFICATIONS.RENT_OVERDUE_TITLE",
                        "NOTIFICATIONS.RENT_OVERDUE_ACCOUNTANT_BODY",
                        vars,
                        nav);
            }
        });
    }

    // PHASE1-DONE: TASK2 late fee — accrue late fee on RentPayment after grace period
    @Transactional
    public BigDecimal applyLateFeeAccrual(RentPaymentSchedule schedule) {
        if (schedule == null || schedule.isLateFeeApplied()) {
            return BigDecimal.ZERO;
        }
        LeaseContract contract = contractRepository.findById(schedule.getContractId()).orElse(null);
        if (contract == null || contract.getTenantId() == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal lateFee = calculateLateFee(schedule.getAmount());
        if (lateFee.signum() <= 0) {
            schedule.setLateFeeApplied(true);
            scheduleRepository.save(schedule);
            return BigDecimal.ZERO;
        }
        RentPayment payment = paymentRepository.findTopByScheduleIdOrderByIdDesc(schedule.getId())
                .orElseGet(() -> RentPayment.builder()
                        .contractId(schedule.getContractId())
                        .scheduleId(schedule.getId())
                        .tenantId(contract.getTenantId())
                        .paymentDate(LocalDate.now())
                        .amountPaid(BigDecimal.ZERO)
                        .amountDue(schedule.getAmount())
                        .paymentMethod("ACCRUAL")
                        .referenceNumber(codeGenerationService.generate("LFEE"))
                        .lateFee(BigDecimal.ZERO)
                        .discount(BigDecimal.ZERO)
                        .build());
        payment.setLateFee(lateFee);
        payment.setAmountDue(schedule.getAmount().add(lateFee));
        paymentRepository.save(payment);
        schedule.setLateFeeApplied(true);
        scheduleRepository.save(schedule);
        notifyRentOverdue(schedule, lateFee);
        return lateFee;
    }

    private BigDecimal calculateLateFee(BigDecimal rentAmount) {
        if (rentAmount == null || rentAmount.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal fixed = lateFeeProperties.getLateFeeFixedAmount();
        if (fixed != null && fixed.signum() > 0) {
            return fixed.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal pct = lateFeeProperties.getLateFeePercentage();
        if (pct == null || pct.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return rentAmount.multiply(pct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> paymentVars(RentPaymentSchedule schedule, LeaseContract contract, String reason) {
        return paymentVars(schedule, contract, reason, null);
    }

    private Map<String, Object> paymentVars(RentPaymentSchedule schedule, LeaseContract contract, String reason, BigDecimal lateFee) {
        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("contractNumber", Objects.toString(contract.getContractNumber(), ""));
        vars.put("dueDate", schedule.getDueDate() != null ? schedule.getDueDate().toString() : "");
        vars.put("amount", schedule.getAmount() != null ? schedule.getAmount().toPlainString() : "0");
        vars.put("reason", firstNonBlank(reason, "-"));
        RentPaymentSchedule nextDue = schedule.getContractId() != null && schedule.getDueDate() != null
                ? scheduleRepository.findFirstByContractIdAndStatusAndDueDateAfterOrderByDueDateAsc(
                        schedule.getContractId(),
                        PaymentScheduleStatus.PENDING,
                        schedule.getDueDate())
                : null;
        vars.put("nextDueDate", nextDue != null && nextDue.getDueDate() != null ? nextDue.getDueDate().toString() : "-");
        if (lateFee != null && lateFee.signum() > 0) {
            vars.put("lateFee", lateFee.toPlainString());
        } else {
            vars.put("lateFee", "0");
        }
        return vars;
    }

    private void createRentRevenueIfMissing(RentPaymentSchedule schedule, RentPayment payment) {
        if (schedule == null || schedule.getId() == null || payment == null) {
            return;
        }
        String marker = "[RENT_PAYMENT_SCHEDULE:" + schedule.getId() + "]";
        if (revenueWriterRepository.existsByDescriptionContaining(marker)) {
            return;
        }
        LeaseContract contract = contractRepository.findById(schedule.getContractId()).orElse(null);
        if (contract == null || contract.getPropertyId() == null) {
            return;
        }

        String unitNumber = contract.getUnitId() != null
                ? unitRepository.findById(contract.getUnitId()).map(u -> u.getUnitNumber()).orElse("-")
                : "-";
        String propertyName = propertyRepository.findById(contract.getPropertyId())
                .map(p -> firstNonBlank(p.getPropertyNameAr(), p.getPropertyName(), p.getPropertyNameEn()))
                .orElse("-");
        String method = firstNonBlank(payment.getPaymentMethod(), schedule.getProofPaymentMethod(), "-");
        String paidDate = payment.getPaymentDate() != null ? payment.getPaymentDate().toString() : "-";
        String acceptedDate = schedule.getReviewedAt() != null ? schedule.getReviewedAt().toLocalDate().toString() : LocalDate.now().toString();

        String description = String.join(" | ",
                "نوع البند: إيجار",
                "جهة البند: الوحدة " + unitNumber + " في العقار " + propertyName,
                "نوع التحويل: " + method,
                "تاريخ الدفع: " + paidDate,
                "تاريخ القبول: " + acceptedDate,
                "العقد: " + Objects.toString(contract.getContractNumber(), "-"),
                marker);

        String prefix = "REV-" + java.time.Year.now().getValue() + "-";
        long seq = revenueWriterRepository.countByRevenueNumberStartingWith(prefix) + 1;
        OtherRevenue revenue = OtherRevenue.builder()
                .revenueNumber(prefix + String.format("%04d", seq))
                .propertyId(contract.getPropertyId())
                .description(description)
                .amount(payment.getAmountPaid() != null ? payment.getAmountPaid() : schedule.getAmount())
                .currency(firstNonBlank(contract.getCurrency(), "OMR"))
                .revenueDate(payment.getPaymentDate() != null ? payment.getPaymentDate() : LocalDate.now())
                .createdAt(LocalDateTime.now())
                .build();
        revenueWriterRepository.save(revenue);
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
