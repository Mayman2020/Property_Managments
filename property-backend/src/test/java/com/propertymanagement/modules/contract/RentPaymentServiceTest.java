package com.propertymanagement.modules.contract;

import com.propertymanagement.codegen.CodeGenerationService;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.entity.PaymentScheduleStatus;
import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.contract.payment.entity.RentPaymentSchedule;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentRepository;
import com.propertymanagement.modules.contract.payment.repository.RentPaymentScheduleRepository;
import com.propertymanagement.modules.contract.payment.service.RentPaymentService;
import com.propertymanagement.modules.contract.payment.dto.AccountantMarkPaidRequest;
import com.propertymanagement.modules.contract.payment.dto.ReviewPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.UploadPaymentProofRequest;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.ownerportal.service.OwnerRevenueShareService;
import com.propertymanagement.modules.finance.revenue.entity.OtherRevenue;
import com.propertymanagement.modules.finance.revenue.repository.OtherRevenueWriterRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RentPaymentServiceTest {

    @Mock RentPaymentRepository paymentRepository;
    @Mock RentPaymentScheduleRepository scheduleRepository;
    @Mock LeaseContractRepository contractRepository;
    @Mock TenantRepository tenantRepository;
    @Mock UserRepository userRepository;
    @Mock UnitRepository unitRepository;
    @Mock PropertyRepository propertyRepository;
    @Mock OtherRevenueWriterRepository revenueWriterRepository;
    @Mock CodeGenerationService codeGenerationService;
    @Mock NotificationService notificationService;
    @Mock PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    @Mock OwnerRevenueShareService ownerRevenueShareService;

    @InjectMocks RentPaymentService service;

    private LeaseContract contract;
    private RentPaymentSchedule schedule;
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        User admin = User.builder().id(1L).role(UserRole.SUPER_ADMIN).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null, List.of()));

        contract = LeaseContract.builder()
                .id(10L).tenantId(3L).propertyId(5L).contractNumber("CNT-001").build();
        tenant = Tenant.builder().id(3L).fullName("Test Tenant").userId(99L).build();
        schedule = RentPaymentSchedule.builder()
                .id(20L).contractId(10L)
                .dueDate(LocalDate.of(2025, 1, 1))
                .amount(BigDecimal.valueOf(1000))
                .status(PaymentScheduleStatus.PENDING)
                .build();

        lenient().when(revenueWriterRepository.existsByDescriptionContaining(anyString())).thenReturn(false);
        lenient().when(revenueWriterRepository.countByRevenueNumberStartingWith(anyString())).thenReturn(0L);
        lenient().when(revenueWriterRepository.save(any(OtherRevenue.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(unitRepository.findById(anyLong())).thenReturn(Optional.of(Unit.builder().id(7L).unitNumber("UNIT-001").build()));
        lenient().when(propertyRepository.findById(anyLong())).thenReturn(Optional.of(Property.builder().id(5L).propertyName("Property 1").build()));
    }

    // ── UPLOAD PROOF ─────────────────────────────────────────────────────────

    @Test
    void uploadProof_throwsBadRequest_whenScheduleAlreadyPaid() {
        RentPaymentSchedule paid = RentPaymentSchedule.builder()
                .id(21L).contractId(10L).amount(BigDecimal.valueOf(1000))
                .status(PaymentScheduleStatus.PAID).build();
        when(scheduleRepository.findById(21L)).thenReturn(Optional.of(paid));

        UploadPaymentProofRequest req = new UploadPaymentProofRequest();
        req.setProofUrl("http://example.com/receipt.pdf");

        assertThatThrownBy(() -> service.uploadProof(21L, 1L, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("already closed");
    }

    @Test
    void uploadProof_throwsBadRequest_whenNoProofUrlProvided() {
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(schedule));

        UploadPaymentProofRequest req = new UploadPaymentProofRequest();
        // no URL set

        assertThatThrownBy(() -> service.uploadProof(20L, 1L, req))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appEx = (AppException) ex;
                    assertThat(appEx.getErrorCode()).isEqualTo("PAYMENT_PROOF_FILE_REQUIRED");
                });
    }

    @Test
    void uploadProof_transitionsScheduleToAwaitingReview() {
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(schedule));
        when(scheduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(contractRepository.findById(10L)).thenReturn(Optional.of(contract));
        when(userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN)).thenReturn(List.of());
        when(userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER)).thenReturn(List.of());
        when(userRepository.findByPropertyIdAndRoleAndActiveTrue(anyLong(), any())).thenReturn(List.of());

        UploadPaymentProofRequest req = new UploadPaymentProofRequest();
        req.setProofUrl("http://example.com/receipt.pdf");

        var result = service.uploadProof(20L, 1L, req);

        assertThat(result.getStatus()).isEqualTo(PaymentScheduleStatus.PENDING_CONFIRMATION.name());
    }

    // ── REVIEW PROOF IDEMPOTENCY ──────────────────────────────────────────────

    @Test
    void reviewProof_approved_doesNotCreateDuplicatePayment_whenPaymentAlreadyExists() {
        RentPaymentSchedule pendingSchedule = RentPaymentSchedule.builder()
                .id(20L).contractId(10L).amount(BigDecimal.valueOf(1000))
                .status(PaymentScheduleStatus.PENDING_CONFIRMATION)
                .proofUrl("http://example.com/proof.pdf")
                .build();
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(pendingSchedule));
        when(scheduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Simulate payment already recorded for this schedule
        RentPayment existingPayment = RentPayment.builder()
                .id(55L).scheduleId(20L).contractId(10L)
                .amountPaid(BigDecimal.valueOf(1000)).amountDue(BigDecimal.valueOf(1000))
                .paymentDate(LocalDate.now()).paymentMethod("BANK_TRANSFER")
                .referenceNumber("REF-001").build();
        when(paymentRepository.findTopByScheduleIdOrderByIdDesc(20L)).thenReturn(Optional.of(existingPayment));

        when(contractRepository.findById(10L)).thenReturn(Optional.of(contract));
        when(tenantRepository.findById(3L)).thenReturn(Optional.of(tenant));
        when(userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN)).thenReturn(List.of());
        when(userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER)).thenReturn(List.of());

        ReviewPaymentProofRequest req = new ReviewPaymentProofRequest();
        req.setStatus("APPROVED");

        service.reviewProof(20L, req, 1L);

        // save() was NOT called for a new RentPayment — idempotent
        verify(paymentRepository, never()).save(any(RentPayment.class));
    }

    @Test
    void reviewProof_rejected_updatesScheduleToRejected() {
        RentPaymentSchedule pendingSchedule = RentPaymentSchedule.builder()
                .id(20L).contractId(10L).amount(BigDecimal.valueOf(1000))
                .status(PaymentScheduleStatus.PENDING_CONFIRMATION).build();
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(pendingSchedule));
        when(scheduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(contractRepository.findById(10L)).thenReturn(Optional.of(contract));
        when(tenantRepository.findById(3L)).thenReturn(Optional.of(tenant));
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        ReviewPaymentProofRequest req = new ReviewPaymentProofRequest();
        req.setStatus("REJECTED");
        req.setNotes("Invalid proof");

        var result = service.reviewProof(20L, req, 1L);

        assertThat(result.getStatus()).isEqualTo(PaymentScheduleStatus.PAYMENT_REJECTED.name());
    }

    @Test
    void reviewProof_throwsBadRequest_whenStatusIsUnsupported() {
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(schedule));

        ReviewPaymentProofRequest req = new ReviewPaymentProofRequest();
        req.setStatus("GARBAGE");

        assertThatThrownBy(() -> service.reviewProof(20L, req, 1L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Unsupported review status");
    }

    // ── ACCOUNTANT MARK PAID ─────────────────────────────────────────────────

    @Test
    void markPaidByAccountant_createsPaymentAndMarksPaid() {
        when(scheduleRepository.findById(20L)).thenReturn(Optional.of(schedule));
        when(scheduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(contractRepository.findById(10L)).thenReturn(Optional.of(contract));
        when(tenantRepository.findById(3L)).thenReturn(Optional.of(tenant));
        when(userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN)).thenReturn(List.of());
        when(userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER)).thenReturn(List.of());

        // No existing payment
        when(paymentRepository.findTopByScheduleIdOrderByIdDesc(20L)).thenReturn(Optional.empty());
        when(codeGenerationService.generate("REF")).thenReturn("REF-ACCT-001");
        RentPayment saved = RentPayment.builder().id(60L).scheduleId(20L).build();
        when(paymentRepository.save(any())).thenReturn(saved);

        AccountantMarkPaidRequest req = new AccountantMarkPaidRequest();
        req.setPaymentMethod("CASH");
        req.setPaymentDate(LocalDate.now());

        var result = service.markPaidByAccountant(20L, req, 1L);

        assertThat(result.getStatus()).isEqualTo(PaymentScheduleStatus.PAID.name());
        verify(paymentRepository).save(any(RentPayment.class));
    }
}
