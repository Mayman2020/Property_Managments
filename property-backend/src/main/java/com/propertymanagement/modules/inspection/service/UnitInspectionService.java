package com.propertymanagement.modules.inspection.service;

import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.inspection.dto.*;
import com.propertymanagement.modules.inspection.entity.*;
import com.propertymanagement.modules.inspection.repository.UnitInspectionItemRepository;
import com.propertymanagement.modules.inspection.repository.UnitInspectionRepository;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.vacancy.service.VacancyAlertRecipients;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UnitInspectionService {

    private static final List<String> DEFAULT_AREAS = List.of(
            "Living Room", "Kitchen", "Bathroom", "Bedroom", "Hallway");

    private final UnitInspectionRepository inspectionRepository;
    private final UnitInspectionItemRepository itemRepository;
    private final LeaseContractRepository contractRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final VacancyAlertRecipients vacancyAlertRecipients;

    // PHASE2B-DONE: TASK2 — unit inspection service
    @Transactional
    public InspectionResponse createInspection(Long contractId, InspectionType type, Long inspectorId) {
        LeaseContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Lease contract not found"));
        if (contract.getUnitId() == null) {
            throw AppException.badRequest("Contract has no unit");
        }
        LocalDateTime now = LocalDateTime.now();
        UnitInspection inspection = UnitInspection.builder()
                .unitId(contract.getUnitId())
                .contractId(contractId)
                .inspectionType(type)
                .status(InspectionStatus.PENDING)
                .inspectorId(inspectorId)
                .createdAt(now)
                .updatedAt(now)
                .build();
        UnitInspection saved = inspectionRepository.save(inspection);
        for (String area : DEFAULT_AREAS) {
            itemRepository.save(UnitInspectionItem.builder()
                    .inspectionId(saved.getId())
                    .area(area)
                    .createdAt(now)
                    .build());
        }
        notifyInspectionScheduled(contract, saved);
        return toResponse(saved, itemRepository.findByInspectionIdOrderByIdAsc(saved.getId()));
    }

    @Transactional(readOnly = true)
    public List<InspectionResponse> listByContract(Long contractId) {
        return inspectionRepository.findByContractIdOrderByCreatedAtDesc(contractId).stream()
                .map(i -> toResponse(i, itemRepository.findByInspectionIdOrderByIdAsc(i.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public InspectionResponse getById(Long inspectionId) {
        UnitInspection inspection = findInspection(inspectionId);
        return toResponse(inspection, itemRepository.findByInspectionIdOrderByIdAsc(inspectionId));
    }

    @Transactional
    public InspectionItemResponse addItem(Long inspectionId, AddInspectionItemRequest request) {
        UnitInspection inspection = findInspection(inspectionId);
        ensureEditable(inspection);
        if (request.getArea() == null || request.getArea().isBlank()) {
            throw AppException.badRequest("Area is required");
        }
        UnitInspectionItem item = itemRepository.save(UnitInspectionItem.builder()
                .inspectionId(inspectionId)
                .area(request.getArea().trim())
                .notes(request.getNotes())
                .createdAt(LocalDateTime.now())
                .build());
        touch(inspection);
        return toItemResponse(item);
    }

    @Transactional
    public InspectionItemResponse updateItem(Long inspectionId, Long itemId, UpdateInspectionItemRequest request) {
        UnitInspection inspection = findInspection(inspectionId);
        ensureEditable(inspection);
        UnitInspectionItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> AppException.notFound("Inspection item not found"));
        if (!item.getInspectionId().equals(inspectionId)) {
            throw AppException.badRequest("Item does not belong to this inspection");
        }
        if (request.getCondition() != null) {
            item.setCondition(request.getCondition());
        }
        if (request.getNotes() != null) {
            item.setNotes(request.getNotes());
        }
        if (request.getPhotoUrl() != null) {
            item.setPhotoUrl(request.getPhotoUrl());
        }
        if (request.getEstimatedDeduction() != null) {
            item.setEstimatedDeduction(request.getEstimatedDeduction());
        }
        UnitInspectionItem saved = itemRepository.save(item);
        touch(inspection);
        return toItemResponse(saved);
    }

    @Transactional
    public InspectionResponse completeInspection(Long inspectionId) {
        UnitInspection inspection = findInspection(inspectionId);
        if (inspection.getStatus() == InspectionStatus.SIGNED) {
            throw AppException.badRequest("Inspection is already signed");
        }
        List<UnitInspectionItem> items = itemRepository.findByInspectionIdOrderByIdAsc(inspectionId);
        if (items.isEmpty()) {
            throw AppException.badRequest("Inspection has no items");
        }
        for (UnitInspectionItem item : items) {
            if (item.getCondition() == null) {
                throw AppException.badRequest("All items must have a condition before completing");
            }
        }
        inspection.setStatus(InspectionStatus.COMPLETED);
        inspection.setUpdatedAt(LocalDateTime.now());
        UnitInspection saved = inspectionRepository.save(inspection);
        return toResponse(saved, items);
    }

    @Transactional
    public InspectionResponse signInspection(Long inspectionId, InspectionSignerRole role, Long actorUserId) {
        UnitInspection inspection = findInspection(inspectionId);
        if (inspection.getStatus() == InspectionStatus.PENDING) {
            throw AppException.badRequest("Inspection must be completed before signing");
        }
        LocalDateTime now = LocalDateTime.now();
        if (role == InspectionSignerRole.TENANT) {
            verifyTenantAccess(inspection.getContractId(), actorUserId);
            inspection.setTenantSignedAt(now);
        } else {
            inspection.setInspectorSignedAt(now);
            if (inspection.getInspectorId() == null) {
                inspection.setInspectorId(actorUserId);
            }
        }
        if (inspection.getTenantSignedAt() != null && inspection.getInspectorSignedAt() != null) {
            inspection.setStatus(InspectionStatus.SIGNED);
            LeaseContract contract = contractRepository.findById(inspection.getContractId()).orElse(null);
            if (contract != null) {
                notifyInspectionCompleted(contract, inspection);
            }
        }
        inspection.setUpdatedAt(now);
        UnitInspection saved = inspectionRepository.save(inspection);
        return toResponse(saved, itemRepository.findByInspectionIdOrderByIdAsc(inspectionId));
    }

    @Transactional
    public LinkDamagesResponse linkDamagesToDeposit(Long inspectionId) {
        UnitInspection inspection = findInspection(inspectionId);
        if (inspection.getInspectionType() != InspectionType.MOVE_OUT) {
            throw AppException.badRequest("Damage linking applies only to move-out inspections");
        }
        LeaseContract contract = contractRepository.findById(inspection.getContractId())
                .orElseThrow(() -> AppException.notFound("Contract not found"));
        BigDecimal total = BigDecimal.ZERO;
        for (UnitInspectionItem item : itemRepository.findByInspectionIdOrderByIdAsc(inspectionId)) {
            if (item.getCondition() == ItemCondition.DAMAGED || item.getCondition() == ItemCondition.MISSING) {
                total = total.add(item.getEstimatedDeduction() != null ? item.getEstimatedDeduction() : BigDecimal.ZERO);
            }
        }
        inspection.setTotalDeduction(total);
        inspection.setUpdatedAt(LocalDateTime.now());
        inspectionRepository.save(inspection);
        if (total.compareTo(BigDecimal.ZERO) > 0) {
            contract.setTerminationHasDamages(true);
            contract.setTerminationDamagesAmount(total);
            contract.setTerminationDamagesTenantPaid(false);
        }
        contractRepository.save(contract);
        BigDecimal deposit = contract.getSecurityDeposit() != null ? contract.getSecurityDeposit() : BigDecimal.ZERO;
        BigDecimal remaining = deposit.subtract(total).max(BigDecimal.ZERO);
        return LinkDamagesResponse.builder()
                .totalDeduction(total)
                .depositAmount(deposit)
                .remainingDeposit(remaining)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean hasSignedMoveOut(Long contractId) {
        return inspectionRepository.findFirstByContractIdAndInspectionTypeAndStatusOrderByCreatedAtDesc(
                contractId, InspectionType.MOVE_OUT, InspectionStatus.SIGNED).isPresent();
    }

    @Transactional(readOnly = true)
    public void verifyTenantCanView(Long contractId, Long userId) {
        verifyTenantAccess(contractId, userId);
    }

    private void verifyTenantAccess(Long contractId, Long userId) {
        LeaseContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> AppException.notFound("Contract not found"));
        Long tenantUserId = resolveTenantUserId(contract);
        if (tenantUserId == null || !tenantUserId.equals(userId)) {
            throw AppException.forbidden("Not allowed to access this inspection");
        }
    }

    private Long resolveTenantUserId(LeaseContract contract) {
        if (contract.getTenantId() == null) {
            return null;
        }
        return tenantRepository.findById(contract.getTenantId())
                .map(Tenant::getUserId)
                .orElse(null);
    }

    private void ensureEditable(UnitInspection inspection) {
        if (inspection.getStatus() == InspectionStatus.SIGNED) {
            throw AppException.badRequest("Signed inspections cannot be edited");
        }
    }

    private UnitInspection findInspection(Long id) {
        return inspectionRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Inspection not found"));
    }

    private void touch(UnitInspection inspection) {
        inspection.setUpdatedAt(LocalDateTime.now());
        inspectionRepository.save(inspection);
    }

    private void notifyInspectionScheduled(LeaseContract contract, UnitInspection inspection) {
        try {
            Long tenantUserId = resolveTenantUserId(contract);
            if (tenantUserId == null) {
                return;
            }
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", contract.getContractNumber());
            vars.put("inspectionType", inspection.getInspectionType().name());
            notificationService.createLocalized(
                    List.of(tenantUserId),
                    inspection.getInspectorId(),
                    contract.getPropertyId(),
                    inspection.getId(),
                    NotificationType.INSPECTION_SCHEDULED,
                    "NOTIFICATIONS.INSPECTION_SCHEDULED_TITLE",
                    "NOTIFICATIONS.INSPECTION_SCHEDULED_BODY",
                    vars,
                    Map.of("contractId", contract.getId(), "inspectionId", inspection.getId()));
        } catch (Exception ignored) {
        }
    }

    private void notifyInspectionCompleted(LeaseContract contract, UnitInspection inspection) {
        try {
            Set<Long> recipients = new LinkedHashSet<>(vacancyAlertRecipients.resolve(contract.getPropertyId()));
            userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                    .map(User::getId).forEach(recipients::add);
            recipients.remove(null);
            if (recipients.isEmpty()) {
                return;
            }
            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("contractNumber", contract.getContractNumber());
            vars.put("inspectionType", inspection.getInspectionType().name());
            notificationService.createLocalized(
                    new ArrayList<>(recipients),
                    inspection.getInspectorId(),
                    contract.getPropertyId(),
                    inspection.getId(),
                    NotificationType.INSPECTION_COMPLETED,
                    "NOTIFICATIONS.INSPECTION_COMPLETED_TITLE",
                    "NOTIFICATIONS.INSPECTION_COMPLETED_BODY",
                    vars,
                    Map.of("contractId", contract.getId(), "inspectionId", inspection.getId()));
        } catch (Exception ignored) {
        }
    }

    private InspectionResponse toResponse(UnitInspection inspection, List<UnitInspectionItem> items) {
        return InspectionResponse.builder()
                .id(inspection.getId())
                .unitId(inspection.getUnitId())
                .contractId(inspection.getContractId())
                .inspectionType(inspection.getInspectionType())
                .status(inspection.getStatus())
                .inspectorId(inspection.getInspectorId())
                .tenantSignedAt(inspection.getTenantSignedAt())
                .inspectorSignedAt(inspection.getInspectorSignedAt())
                .notes(inspection.getNotes())
                .totalDeduction(inspection.getTotalDeduction())
                .createdAt(inspection.getCreatedAt())
                .items(items.stream().map(this::toItemResponse).toList())
                .build();
    }

    private InspectionItemResponse toItemResponse(UnitInspectionItem item) {
        return InspectionItemResponse.builder()
                .id(item.getId())
                .area(item.getArea())
                .condition(item.getCondition())
                .notes(item.getNotes())
                .photoUrl(item.getPhotoUrl())
                .estimatedDeduction(item.getEstimatedDeduction())
                .build();
    }
}
