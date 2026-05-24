package com.propertymanagement.modules.contract.fee.service;

import com.propertymanagement.modules.contract.fee.dto.ContractFeeRequest;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import com.propertymanagement.modules.contract.fee.entity.ContractFee;
import com.propertymanagement.modules.contract.fee.repository.ContractFeeRepository;

@Service
@RequiredArgsConstructor
public class ContractFeeService {

    private final ContractFeeRepository feeRepository;

    /**
     * Mirrors the DB CHECK constraint {@code contract_fees_fee_type_check}.
     * Keeping the allow-list in the service surfaces unknown fee types as a 400
     * instead of bubbling a 500 DataIntegrityViolationException up the stack.
     */
    private static final Set<String> ALLOWED_FEE_TYPES = Set.of(
            "ELECTRICITY", "WATER", "GAS", "SERVICE_CHARGE",
            "PARKING", "MAINTENANCE_CHARGE", "PENALTY", "OTHER");

    public List<ContractFee> getByContract(Long contractId) {
        return feeRepository.findByContractId(contractId);
    }

    @Transactional
    public ContractFee create(ContractFeeRequest request) {
        ContractFee fee = ContractFee.builder()
                .contractId(request.getContractId())
                .feeType(normalizeFeeType(request.getFeeType()))
                .description(request.getDescription())
                .amount(request.getAmount())
                .dueDate(request.getDueDate())
                .paid(Boolean.TRUE.equals(request.getPaid()))
                .paidDate(request.getPaidDate())
                .receiptUrl(request.getReceiptUrl())
                .notes(request.getNotes())
                .build();
        return feeRepository.save(fee);
    }

    @Transactional
    public ContractFee markPaid(Long id, String receiptUrl) {
        ContractFee fee = feeRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Contract fee not found: " + id));
        fee.setPaid(true);
        fee.setReceiptUrl(receiptUrl);
        return feeRepository.save(fee);
    }

    @Transactional
    public void delete(Long id) {
        if (!feeRepository.existsById(id)) throw AppException.notFound("Contract fee not found: " + id);
        feeRepository.deleteById(id);
    }

    private String normalizeFeeType(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        String upper = trimmed.toUpperCase(Locale.ROOT);
        if (!ALLOWED_FEE_TYPES.contains(upper)) {
            throw AppException.badRequest(
                    "feeType must be one of " + ALLOWED_FEE_TYPES + " (got: " + raw + ")",
                    "INVALID_FEE_TYPE");
        }
        return upper;
    }
}
