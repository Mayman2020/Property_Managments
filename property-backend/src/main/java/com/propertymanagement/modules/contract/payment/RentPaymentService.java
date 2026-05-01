package com.propertymanagement.modules.contract.payment;

import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.contract.payment.dto.PaymentResponse;
import com.propertymanagement.modules.contract.payment.dto.RecordPaymentDto;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.tenant.TenantRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import com.propertymanagement.codegen.CodeGenerationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RentPaymentService {

    private final RentPaymentRepository paymentRepository;
    private final RentPaymentScheduleRepository scheduleRepository;
    private final LeaseContractRepository contractRepository;
    private final TenantRepository tenantRepository;
    private final CodeGenerationService codeGenerationService;

    public Page<PaymentResponse> getAll(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(this::toResponse);
    }

    public List<PaymentResponse> getByContract(Long contractId) {
        return paymentRepository.findByContractId(contractId).stream().map(this::toResponse).toList();
    }

    public List<ScheduleItemResponse> getSchedule(Long contractId) {
        return scheduleRepository.findByContractId(contractId).stream().map(this::toScheduleResponse).toList();
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

    private PaymentResponse toResponse(RentPayment p) {
        String contractNumber = p.getContractId() != null
                ? contractRepository.findById(p.getContractId())
                    .map(c -> c.getContractNumber()).orElse(null)
                : null;
        String tenantName = p.getTenantId() != null
                ? tenantRepository.findById(p.getTenantId())
                    .map(t -> t.getFullName()).orElse(null)
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
                .build();
    }

    private ScheduleItemResponse toScheduleResponse(RentPaymentSchedule s) {
        long daysOverdue = s.getStatus() == PaymentScheduleStatus.OVERDUE && s.getDueDate() != null
                ? ChronoUnit.DAYS.between(s.getDueDate(), LocalDate.now())
                : 0;

        return ScheduleItemResponse.builder()
                .id(s.getId())
                .contractId(s.getContractId())
                .dueDate(s.getDueDate())
                .amount(s.getAmount())
                .periodFrom(s.getPeriodFrom())
                .periodTo(s.getPeriodTo())
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .daysOverdue(daysOverdue)
                .createdAt(s.getCreatedAt())
                .build();
    }
}
