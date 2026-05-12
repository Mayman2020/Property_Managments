package com.propertymanagement.modules.contract.fee.service;

import com.propertymanagement.modules.contract.fee.dto.ContractFeeRequest;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import com.propertymanagement.modules.contract.fee.entity.ContractFee;
import com.propertymanagement.modules.contract.fee.repository.ContractFeeRepository;

@Service
@RequiredArgsConstructor
public class ContractFeeService {

    private final ContractFeeRepository feeRepository;

    public List<ContractFee> getByContract(Long contractId) {
        return feeRepository.findByContractId(contractId);
    }

    @Transactional
    public ContractFee create(ContractFeeRequest request) {
        ContractFee fee = ContractFee.builder()
                .contractId(request.getContractId())
                .feeType(request.getFeeType())
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
}
