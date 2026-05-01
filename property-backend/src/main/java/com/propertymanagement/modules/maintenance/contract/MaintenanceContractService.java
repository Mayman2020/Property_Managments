package com.propertymanagement.modules.maintenance.contract;

import com.propertymanagement.modules.contractor.ContractorCompany;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.assignment.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractResponse;
import com.propertymanagement.modules.maintenance.contractinvoice.MaintenanceContractInvoiceRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceContractService {

    private final MaintenanceContractRepository contractRepo;
    private final ContractorCompanyRepository companyRepo;
    private final MaintenanceContractInvoiceRepository invoiceRepo;

    // ── List all contracts (global, admin view) ──────────────────────────
    public List<MaintenanceContractResponse> listAll() {
        return contractRepo.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── List contracts for a property ────────────────────────────────────
    public List<MaintenanceContractResponse> listByProperty(Long propertyId) {
        return contractRepo.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── List contracts for a company ────────────────────────────────────
    public List<MaintenanceContractResponse> listByCompany(Long companyId) {
        return contractRepo.findByContractorCompanyIdOrderByCreatedAtDesc(companyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Get single contract ───────────────────────────────────────────────
    public MaintenanceContractResponse getById(Long id) {
        return toResponse(requireContract(id));
    }

    // ── Activate contract ─────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractResponse activate(Long id) {
        MaintenanceContract contract = requireContract(id);
        if ("ACTIVE".equals(contract.getStatus())) {
            throw AppException.badRequest("Contract is already active");
        }
        if ("ENDED".equals(contract.getStatus()) || "CANCELLED".equals(contract.getStatus())) {
            throw AppException.badRequest("Cannot reactivate a terminated or cancelled contract");
        }
        contract.setStatus("ACTIVE");
        contractRepo.save(contract);
        return toResponse(contract);
    }

    // ── Terminate contract ────────────────────────────────────────────────
    @Transactional
    public MaintenanceContractResponse terminate(Long id) {
        MaintenanceContract contract = requireContract(id);
        if (!"ACTIVE".equals(contract.getStatus())) {
            throw AppException.badRequest("Only active contracts can be terminated");
        }
        contract.setStatus("ENDED");
        if (contract.getEndDate() == null || contract.getEndDate().isAfter(LocalDate.now())) {
            contract.setEndDate(LocalDate.now());
        }
        contractRepo.save(contract);
        return toResponse(contract);
    }

    // ── Helper ────────────────────────────────────────────────────────────
    private MaintenanceContract requireContract(Long id) {
        return contractRepo.findById(id)
                .orElseThrow(() -> AppException.notFound("Maintenance contract not found with id " + id));
    }

    MaintenanceContractResponse toResponse(MaintenanceContract c) {
        String companyName = null, companyNameAr = null, companyNameEn = null;
        ContractorCompany company = companyRepo.findById(c.getContractorCompanyId()).orElse(null);
        if (company != null) {
            companyName  = company.getName();
            companyNameAr = company.getNameAr();
            companyNameEn = company.getNameEn();
        }
        int invoiceCount = (int) invoiceRepo.countByContractId(c.getId());
        return new MaintenanceContractResponse(
                c.getId(), c.getPropertyId(), c.getContractorCompanyId(),
                companyName, companyNameAr, companyNameEn,
                c.getAssignmentId(), c.getContractNumber(),
                c.getStartDate(), c.getEndDate(),
                c.getSlaHours(), c.getContractValue(),
                c.getStatus(), c.getNotes(), c.getCreatedAt(),
                invoiceCount
        );
    }
}
