package com.propertymanagement.modules.contract.annex.service;

import com.propertymanagement.modules.contract.annex.dto.ContractAnnexRequest;
import com.propertymanagement.modules.contract.annex.dto.ContractAnnexResponse;
import com.propertymanagement.modules.contract.annex.entity.ContractAnnex;
import com.propertymanagement.modules.contract.annex.repository.ContractAnnexRepository;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContractAnnexService {

    private final ContractAnnexRepository repository;
    private final LeaseContractRepository contractRepository;
    private final UserRepository userRepository;

    public List<ContractAnnexResponse> getByContract(Long contractId) {
        contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + contractId));
        return repository.findByContractIdOrderByCreatedAtAsc(contractId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public ContractAnnexResponse create(Long contractId, ContractAnnexRequest request) {
        contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found: " + contractId));
        ContractAnnex annex = ContractAnnex.builder()
                .contractId(contractId)
                .annexNumber(request.getAnnexNumber())
                .title(request.getTitle())
                .description(request.getDescription())
                .effectiveDate(request.getEffectiveDate())
                .documentUrl(request.getDocumentUrl())
                .createdBy(currentUserId())
                .build();
        return toResponse(repository.save(annex));
    }

    @Transactional
    public ContractAnnexResponse update(Long id, ContractAnnexRequest request) {
        ContractAnnex annex = repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Annex not found: " + id));
        annex.setTitle(request.getTitle());
        annex.setAnnexNumber(request.getAnnexNumber());
        annex.setDescription(request.getDescription());
        annex.setEffectiveDate(request.getEffectiveDate());
        annex.setDocumentUrl(request.getDocumentUrl());
        return toResponse(repository.save(annex));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) throw AppException.notFound("Annex not found: " + id);
        repository.deleteById(id);
    }

    private ContractAnnexResponse toResponse(ContractAnnex a) {
        return ContractAnnexResponse.builder()
                .id(a.getId())
                .contractId(a.getContractId())
                .annexNumber(a.getAnnexNumber())
                .title(a.getTitle())
                .description(a.getDescription())
                .effectiveDate(a.getEffectiveDate())
                .documentUrl(a.getDocumentUrl())
                .createdBy(a.getCreatedBy())
                .createdByName(resolveUserName(a.getCreatedBy()))
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    private Long currentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) return u.getId();
        } catch (Exception ignored) {}
        return null;
    }
}
