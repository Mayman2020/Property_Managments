package com.propertymanagement.modules.maintenance.assignment;

import com.propertymanagement.modules.contractor.ContractorCompany;
import com.propertymanagement.modules.contractor.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.assignment.dto.AssignMaintenanceRequest;
import com.propertymanagement.modules.maintenance.assignment.dto.ContractDataRequest;
import com.propertymanagement.modules.maintenance.assignment.dto.MaintenanceAssignmentResponse;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceAssignmentService {

    private final PropertyMaintenanceAssignmentRepository assignmentRepo;
    private final MaintenanceProviderRepository providerRepo;
    private final MaintenanceContractRepository contractRepo;
    private final PropertyRepository propertyRepo;
    private final UserRepository userRepo;
    private final ContractorCompanyRepository companyRepo;

    // ── List all assignments for a property ──────────────────────────────
    public List<MaintenanceAssignmentResponse> listByProperty(Long propertyId) {
        requirePropertyExists(propertyId);
        return assignmentRepo.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Assign provider to property ──────────────────────────────────────
    @Transactional
    public MaintenanceAssignmentResponse assign(Long propertyId, AssignMaintenanceRequest req) {
        requirePropertyExists(propertyId);

        String type = req.providerType();
        if (type == null || (!type.equals("USER") && !type.equals("COMPANY"))) {
            throw AppException.badRequest("providerType must be USER or COMPANY");
        }

        // Validate & resolve the MaintenanceProvider record
        MaintenanceProvider provider = resolveProvider(type, req);

        // Prevent duplicate active assignment for same provider+property
        assignmentRepo.findActiveByPropertyAndProvider(propertyId, provider.getId()).ifPresent(existing -> {
            throw AppException.conflict("This provider is already actively assigned to the property");
        });

        // If new assignment is primary → end existing active primary
        if (req.isPrimary()) {
            assignmentRepo.findActivePrimaryByPropertyId(propertyId).ifPresent(existing -> {
                existing.setStatus("ENDED");
                existing.setEndDate(LocalDate.now());
                assignmentRepo.save(existing);
            });
        }

        // Create assignment
        PropertyMaintenanceAssignment assignment = PropertyMaintenanceAssignment.builder()
                .propertyId(propertyId)
                .maintenanceProviderId(provider.getId())
                .isPrimary(req.isPrimary())
                .startDate(req.startDate() != null ? req.startDate() : LocalDate.now())
                .status("ACTIVE")
                .notes(req.notes())
                .build();
        assignment = assignmentRepo.save(assignment);

        // Create contract if COMPANY + contract data provided
        if ("COMPANY".equals(type) && req.contract() != null) {
            createContract(propertyId, provider.getCompanyId(), assignment.getId(), req.contract());
        }

        return toResponse(assignment);
    }

    // ── End / remove an assignment ────────────────────────────────────────
    @Transactional
    public MaintenanceAssignmentResponse endAssignment(Long propertyId, Long assignmentId) {
        PropertyMaintenanceAssignment assignment = assignmentRepo
                .findByIdAndPropertyId(assignmentId, propertyId)
                .orElseThrow(() -> AppException.notFound("Assignment not found"));

        if (!"ACTIVE".equals(assignment.getStatus())) {
            throw AppException.badRequest("Assignment is not active");
        }

        assignment.setStatus("ENDED");
        assignment.setEndDate(LocalDate.now());
        assignmentRepo.save(assignment);

        // End linked contract if exists
        contractRepo.findByAssignmentId(assignmentId).ifPresent(contract -> {
            if ("ACTIVE".equals(contract.getStatus())) {
                contract.setStatus("ENDED");
                contract.setEndDate(LocalDate.now());
                contractRepo.save(contract);
            }
        });

        return toResponse(assignment);
    }

    // ── Helper: resolve or create MaintenanceProvider ────────────────────
    private MaintenanceProvider resolveProvider(String type, AssignMaintenanceRequest req) {
        if ("USER".equals(type)) {
            Long userId = req.userId();
            if (userId == null) throw AppException.badRequest("userId is required for USER provider");

            User user = userRepo.findById(userId)
                    .orElseThrow(() -> AppException.notFound("User not found with id " + userId));

            if (user.getRole() != UserRole.MAINTENANCE_OFFICER) {
                throw AppException.badRequest("User must have MAINTENANCE_OFFICER role");
            }

            return providerRepo.findByUserId(userId)
                    .orElseGet(() -> providerRepo.save(
                            MaintenanceProvider.builder()
                                    .providerType("USER")
                                    .userId(userId)
                                    .status("ACTIVE")
                                    .build()
                    ));
        } else {
            Long companyId = req.companyId();
            if (companyId == null) throw AppException.badRequest("companyId is required for COMPANY provider");

            companyRepo.findById(companyId)
                    .filter(ContractorCompany::isActive)
                    .orElseThrow(() -> AppException.notFound("Active company not found with id " + companyId));

            return providerRepo.findByCompanyId(companyId)
                    .orElseGet(() -> providerRepo.save(
                            MaintenanceProvider.builder()
                                    .providerType("COMPANY")
                                    .companyId(companyId)
                                    .status("ACTIVE")
                                    .build()
                    ));
        }
    }

    // ── Helper: create maintenance contract ──────────────────────────────
    private void createContract(Long propertyId, Long companyId, Long assignmentId, ContractDataRequest cr) {
        if (cr.startDate() == null) throw AppException.badRequest("Contract startDate is required");
        if (cr.endDate() != null && cr.endDate().isBefore(cr.startDate())) {
            throw AppException.badRequest("Contract endDate must be after or equal to startDate");
        }
        if (cr.slaHours() != null && cr.slaHours() <= 0) {
            throw AppException.badRequest("slaHours must be positive");
        }

        // Contract number is always backend-generated (unique, traceable)
        String contractNumber = generateContractNumber();

        contractRepo.save(MaintenanceContract.builder()
                .propertyId(propertyId)
                .contractorCompanyId(companyId)
                .assignmentId(assignmentId)
                .contractNumber(contractNumber)
                .startDate(cr.startDate())
                .endDate(cr.endDate())
                .slaHours(cr.slaHours())
                .contractValue(cr.contractValue())
                .notes(cr.notes())
                .status("ACTIVE")
                .build());
    }

    // ── Helper: generate unique contract number ───────────────────────────
    private String generateContractNumber() {
        int year = LocalDate.now().getYear();
        String prefix = String.format("MC-%d-", year);
        long seq = contractRepo.countByContractNumberStartingWith(prefix) + 1;
        String candidate = String.format("%s%05d", prefix, seq);
        while (contractRepo.existsByContractNumber(candidate)) {
            seq++;
            candidate = String.format("%s%05d", prefix, seq);
        }
        return candidate;
    }

    // ── Helper: validate property exists ─────────────────────────────────
    private void requirePropertyExists(Long propertyId) {
        if (!propertyRepo.existsById(propertyId)) {
            throw AppException.notFound("Property not found with id " + propertyId);
        }
    }

    // ── Mapping to response ───────────────────────────────────────────────
    private MaintenanceAssignmentResponse toResponse(PropertyMaintenanceAssignment a) {
        MaintenanceProvider provider = providerRepo.findById(a.getMaintenanceProviderId())
                .orElse(null);

        String providerType = provider != null ? provider.getProviderType() : null;
        Long userId = provider != null ? provider.getUserId() : null;
        Long companyId = provider != null ? provider.getCompanyId() : null;

        String userFullName = null, userEmail = null, userRole = null;
        if (userId != null) {
            User u = userRepo.findById(userId).orElse(null);
            if (u != null) {
                userFullName = u.getFullName();
                userEmail = u.getEmail();
                userRole = u.getRole().name();
            }
        }

        String companyName = null, companyNameAr = null, companyNameEn = null;
        String companyPhone = null, companyEmail = null;
        if (companyId != null) {
            ContractorCompany company = companyRepo.findById(companyId).orElse(null);
            if (company != null) {
                companyName = company.getName();
                companyNameAr = company.getNameAr();
                companyNameEn = company.getNameEn();
                companyPhone = company.getPhone();
                companyEmail = company.getEmail();
            }
        }

        MaintenanceAssignmentResponse.ContractInfo contractInfo = null;
        MaintenanceContract contract = contractRepo.findByAssignmentId(a.getId()).orElse(null);
        if (contract != null) {
            contractInfo = new MaintenanceAssignmentResponse.ContractInfo(
                    contract.getId(), contract.getContractNumber(),
                    contract.getStartDate(), contract.getEndDate(),
                    contract.getSlaHours(), contract.getContractValue(), contract.getStatus()
            );
        }

        return new MaintenanceAssignmentResponse(
                a.getId(), a.getPropertyId(), a.getStatus(), a.isPrimary(),
                a.getStartDate(), a.getEndDate(), a.getNotes(), a.getCreatedAt(),
                provider != null ? provider.getId() : null, providerType,
                userId, userFullName, userEmail, userRole,
                companyId, companyName, companyNameAr, companyNameEn, companyPhone, companyEmail,
                contractInfo
        );
    }
}
