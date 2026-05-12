package com.propertymanagement.modules.maintenance.assignment.service;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import com.propertymanagement.modules.contractor.repository.ContractorCompanyRepository;
import com.propertymanagement.modules.maintenance.assignment.dto.AssignMaintenanceRequest;
import com.propertymanagement.modules.maintenance.assignment.dto.ContractDataRequest;
import com.propertymanagement.modules.maintenance.assignment.dto.MaintenanceAssignmentResponse;
import com.propertymanagement.modules.maintenance.contract.service.MaintenanceContractService;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceProvider;
import com.propertymanagement.modules.maintenance.assignment.entity.PropertyMaintenanceAssignment;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceProviderRepository;
import com.propertymanagement.modules.maintenance.assignment.repository.PropertyMaintenanceAssignmentRepository;

@Service
@RequiredArgsConstructor
public class MaintenanceAssignmentService {

    private final PropertyMaintenanceAssignmentRepository assignmentRepo;
    private final MaintenanceProviderRepository providerRepo;
    private final MaintenanceContractRepository contractRepo;
    private final PropertyRepository propertyRepo;
    private final UserRepository userRepo;
    private final ContractorCompanyRepository companyRepo;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final MaintenanceContractService maintenanceContractService;

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
        boolean createsCompanyContract = "COMPANY".equals(type) && req.contract() != null;

        // Prevent duplicate active assignment for same provider+property
        assignmentRepo.findOpenByPropertyAndProvider(propertyId, provider.getId()).ifPresent(existing -> {
            throw AppException.conflict("This provider is already actively assigned to the property");
        });

        // If new assignment is primary → end existing active primary
        if (req.isPrimary() && !createsCompanyContract) {
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
                .status(createsCompanyContract ? "PENDING_OWNER_APPROVAL" : "ACTIVE")
                .notes(req.notes())
                .build();
        assignment = assignmentRepo.save(assignment);
        if (!createsCompanyContract) {
            notifyAssignmentCreated(propertyId, provider, assignment);
        }

        // Create contract if COMPANY + contract data provided
        if (createsCompanyContract) {
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
        notifyAssignmentEnded(assignment);

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

            if (!UserRole.isMaintenanceOfficer(user.getRole())) {
                throw AppException.badRequest("User must have a maintenance officer role");
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
                    .filter(ContractorCompanyEntity::isActive)
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
        String contractNumber = maintenanceContractService.generateContractNumber();

        MaintenanceContract contract = contractRepo.save(MaintenanceContract.builder()
                .propertyId(propertyId)
                .contractorCompanyId(companyId)
                .assignmentId(assignmentId)
                .contractNumber(contractNumber)
                .startDate(cr.startDate())
                .endDate(cr.endDate())
                .slaHours(cr.slaHours())
                .contractValue(cr.contractValue())
                .notes(cr.notes())
                .status("DRAFT")
                .ownerApprovalStatus("PENDING")
                .build());
        maintenanceContractService.notifyDraftCreated(contract, currentActorUserId());
    }

    // ── Helper: generate unique contract number ───────────────────────────
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
            ContractorCompanyEntity company = companyRepo.findById(companyId).orElse(null);
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

    private void notifyAssignmentCreated(Long propertyId, MaintenanceProvider provider, PropertyMaintenanceAssignment assignment) {
        if (provider == null || propertyId == null) {
            return;
        }
        List<Long> recipients = new ArrayList<>(propertyAdminIds(propertyId));
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(propertyId));
        if ("USER".equals(provider.getProviderType()) && provider.getUserId() != null) {
            recipients.add(provider.getUserId());
        }
        if ("COMPANY".equals(provider.getProviderType()) && provider.getCompanyId() != null) {
            recipients.addAll(contractorStaffIds(provider.getCompanyId(), propertyId));
        }
        recipients = recipients.stream().distinct().toList();
        if (recipients.isEmpty()) {
            return;
        }
        String target = providerLabel(provider);
        String primaryTag = assignment.isPrimary() ? " (primary)" : "";
        notificationService.createForRecipients(
                recipients,
                currentActorUserId(),
                propertyId,
                null,
                NotificationType.MAINTENANCE_PROVIDER_ASSIGNED,
                "Maintenance provider assigned",
                "Maintenance provider " + target + " was assigned to property #" + propertyId + primaryTag + ".",
                Map.of(
                        "titleKey", "NOTIFICATIONS.TYPES.MAINTENANCE_PROVIDER_ASSIGNED.TITLE",
                        "bodyKey", "NOTIFICATIONS.TYPES.MAINTENANCE_PROVIDER_ASSIGNED.BODY",
                        "vars", Map.of("providerName", target, "propertyId", propertyId, "primaryTag", primaryTag.trim())
                )
        );
    }

    private void notifyAssignmentEnded(PropertyMaintenanceAssignment assignment) {
        if (assignment == null || assignment.getPropertyId() == null) {
            return;
        }
        MaintenanceProvider provider = providerRepo.findById(assignment.getMaintenanceProviderId()).orElse(null);
        List<Long> recipients = new ArrayList<>(propertyAdminIds(assignment.getPropertyId()));
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(assignment.getPropertyId()));
        if (provider != null && "USER".equals(provider.getProviderType()) && provider.getUserId() != null) {
            recipients.add(provider.getUserId());
        }
        if (provider != null && "COMPANY".equals(provider.getProviderType()) && provider.getCompanyId() != null) {
            recipients.addAll(contractorStaffIds(provider.getCompanyId(), assignment.getPropertyId()));
        }
        recipients = recipients.stream().distinct().toList();
        if (recipients.isEmpty()) {
            return;
        }
        String target = provider != null ? providerLabel(provider) : "provider #" + assignment.getMaintenanceProviderId();
        notificationService.createForRecipients(
                recipients,
                currentActorUserId(),
                assignment.getPropertyId(),
                null,
                NotificationType.MAINTENANCE_PROVIDER_UNASSIGNED,
                "Maintenance provider assignment ended",
                "Maintenance provider " + target + " was ended for property #" + assignment.getPropertyId() + ".",
                Map.of(
                        "titleKey", "NOTIFICATIONS.TYPES.MAINTENANCE_PROVIDER_UNASSIGNED.TITLE",
                        "bodyKey", "NOTIFICATIONS.TYPES.MAINTENANCE_PROVIDER_UNASSIGNED.BODY",
                        "vars", Map.of("providerName", target, "propertyId", assignment.getPropertyId())
                )
        );
    }

    private List<Long> propertyAdminIds(Long propertyId) {
        Collection<User> users = new ArrayList<>(userRepo.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN));
        users.addAll(userRepo.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.GENERAL_MANAGER));
        return users.stream().map(User::getId).distinct().collect(Collectors.toList());
    }

    private List<Long> contractorStaffIds(Long companyId, Long propertyId) {
        return userRepo.findActiveContractorStaffForProperty(propertyId, companyId).stream()
                .map(User::getId)
                .toList();
    }

    private String providerLabel(MaintenanceProvider provider) {
        if (provider == null) {
            return "unknown";
        }
        if ("USER".equals(provider.getProviderType()) && provider.getUserId() != null) {
            User u = userRepo.findById(provider.getUserId()).orElse(null);
            return u != null ? (u.getFullName() != null ? u.getFullName() : ("user#" + u.getId())) : ("user#" + provider.getUserId());
        }
        if ("COMPANY".equals(provider.getProviderType()) && provider.getCompanyId() != null) {
            ContractorCompanyEntity c = companyRepo.findById(provider.getCompanyId()).orElse(null);
            if (c != null) {
                if (c.getNameAr() != null && !c.getNameAr().isBlank()) return c.getNameAr().trim();
                if (c.getNameEn() != null && !c.getNameEn().isBlank()) return c.getNameEn().trim();
                if (c.getName() != null && !c.getName().isBlank()) return c.getName().trim();
            }
            return "company#" + provider.getCompanyId();
        }
        return "provider#" + provider.getId();
    }

    private Long currentActorUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        return null;
    }
}
