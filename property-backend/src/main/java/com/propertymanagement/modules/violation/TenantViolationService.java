package com.propertymanagement.modules.violation;

import com.propertymanagement.modules.violation.dto.ViolationRequest;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantViolationService {

    private final TenantViolationRepository violationRepository;

    public Page<TenantViolation> getAll(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            return violationRepository.findByStatus(status, pageable);
        }
        return violationRepository.findAll(pageable);
    }

    public List<TenantViolation> getByTenant(Long tenantId) {
        return violationRepository.findByTenantId(tenantId);
    }

    public List<TenantViolation> getByContract(Long contractId) {
        return violationRepository.findByContractId(contractId);
    }

    @Transactional
    public TenantViolation create(ViolationRequest request) {
        TenantViolation violation = TenantViolation.builder()
                .contractId(request.getContractId())
                .tenantId(request.getTenantId())
                .unitId(request.getUnitId())
                .violationType(request.getViolationType())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .status("OPEN")
                .fineAmount(request.getFineAmount() != null ? request.getFineAmount() : BigDecimal.ZERO)
                .evidenceUrl(request.getEvidenceUrl())
                .notes(request.getNotes())
                .build();
        return violationRepository.save(violation);
    }

    @Transactional
    public TenantViolation resolve(Long id, String resolution) {
        TenantViolation violation = violationRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Violation not found: " + id));
        violation.setStatus("RESOLVED");
        violation.setResolvedAt(LocalDateTime.now());
        violation.setNotes(resolution != null ? resolution : violation.getNotes());
        return violationRepository.save(violation);
    }
}
