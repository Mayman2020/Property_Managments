package com.propertymanagement.modules.myrequests.service;

import com.propertymanagement.modules.complaint.repository.TenantComplaintRepository;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.hr.leave.repository.LeaveRequestRepository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.maintenance.assignment.repository.MaintenanceContractRepository;
import com.propertymanagement.modules.maintenance.request.repository.MaintenanceRequestRepository;
import com.propertymanagement.modules.myrequests.dto.MyRequestResponse;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.tenantportal.repository.ContractActionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MyRequestsService {

    private final MaintenanceRequestRepository maintenanceRequestRepo;
    private final LeaseContractRepository leaseContractRepo;
    private final MaintenanceContractRepository maintenanceContractRepo;
    private final LeaveRequestRepository leaveRequestRepo;
    private final EmployeeRepository employeeRepo;
    private final TenantRepository tenantRepo;
    private final ContractActionRequestRepository contractActionRequestRepo;
    private final TenantComplaintRepository tenantComplaintRepo;
    private final PropertyRepository propertyRepo;

    @Transactional(readOnly = true)
    public List<MyRequestResponse> listForUser(Long userId) {
        List<MyRequestResponse> rows = new ArrayList<>();
        addMaintenanceRequests(rows, userId);
        addLeaseActionRequests(rows, userId);
        addMaintenanceContractRequests(rows, userId);
        addLeaveRequests(rows, userId);
        addTenantPortalRequests(rows, userId);
        rows.sort(Comparator.comparing(MyRequestResponse::requestedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return rows;
    }

    private void addMaintenanceRequests(List<MyRequestResponse> rows, Long userId) {
        maintenanceRequestRepo.findByCreatedByOrderByCreatedAtDesc(userId).forEach(r -> rows.add(new MyRequestResponse(
                "MAINTENANCE_REQUEST",
                r.getId(),
                r.getRequestNumber(),
                "طلب صيانة",
                r.getTitle(),
                r.getStatus() != null ? r.getStatus().name() : null,
                maintenanceProgress(r.getStatus() != null ? r.getStatus().name() : null),
                firstDate(r.getCreatedAt(), r.getCreatedOn()),
                "PROPERTY",
                r.getPropertyId(),
                propertyLabel(r.getPropertyId()),
                r.getDescription(),
                "/admin/maintenance/" + r.getId()
        )));
    }

    private void addLeaseActionRequests(List<MyRequestResponse> rows, Long userId) {
        leaseContractRepo.findLeaseRequestsByRequester(userId).forEach(c -> {
            if (userId.equals(c.getTerminationRequestedBy())) {
                rows.add(new MyRequestResponse(
                        "LEASE_TERMINATION",
                        c.getId(),
                        c.getContractNumber(),
                        "طلب إلغاء عقد إيجار",
                        contractSubject(c),
                        c.getStatus() != null ? c.getStatus().name() : null,
                        ownerDecisionProgress(c.getStatus() != null ? c.getStatus().name() : null, c.getTerminationDecisionAt()),
                        c.getTerminationRequestedAt(),
                        "CONTRACT",
                        c.getId(),
                        propertyLabel(c.getPropertyId()),
                        firstNonBlank(c.getTerminationRequestNotes(), c.getTerminationReason()),
                        "/admin/contracts/" + c.getId()
                ));
            }
            if (userId.equals(c.getRenewalRequestedBy())) {
                rows.add(new MyRequestResponse(
                        "LEASE_RENEWAL",
                        c.getId(),
                        c.getContractNumber(),
                        "طلب تجديد عقد إيجار",
                        contractSubject(c),
                        firstNonBlank(c.getRenewalDecisionStatus(), c.getStatus() != null ? c.getStatus().name() : null),
                        ownerDecisionProgress(c.getStatus() != null ? c.getStatus().name() : null, c.getRenewalDecisionAt()),
                        c.getRenewalRequestedAt(),
                        "CONTRACT",
                        c.getId(),
                        propertyLabel(c.getPropertyId()),
                        c.getRenewalRequestedNote(),
                        "/admin/contracts/" + c.getId()
                ));
            }
        });
    }

    private void addMaintenanceContractRequests(List<MyRequestResponse> rows, Long userId) {
        maintenanceContractRepo.findRequestsByRequester(userId).forEach(c -> {
            if (userId.equals(c.getTerminationRequestedBy())) {
                rows.add(new MyRequestResponse(
                        "MAINTENANCE_CONTRACT_TERMINATION",
                        c.getId(),
                        c.getContractNumber(),
                        "طلب إلغاء عقد صيانة",
                        "عقد صيانة للعقار",
                        c.getStatus(),
                        ownerDecisionProgress(c.getStatus(), c.getTerminationDecisionAt()),
                        c.getTerminationRequestedAt(),
                        "MAINTENANCE_CONTRACT",
                        c.getId(),
                        propertyLabel(c.getPropertyId()),
                        c.getTerminationRequestNotes(),
                        "/admin/contracts/maintenance/" + c.getId()
                ));
            }
            if (userId.equals(c.getRenewalRequestedBy())) {
                rows.add(new MyRequestResponse(
                        "MAINTENANCE_CONTRACT_RENEWAL",
                        c.getId(),
                        c.getContractNumber(),
                        "طلب تجديد عقد صيانة",
                        "عقد صيانة للعقار",
                        firstNonBlank(c.getRenewalDecisionStatus(), c.getStatus()),
                        ownerDecisionProgress(c.getStatus(), c.getRenewalDecisionAt()),
                        c.getRenewalRequestedAt(),
                        "MAINTENANCE_CONTRACT",
                        c.getId(),
                        propertyLabel(c.getPropertyId()),
                        c.getRenewalRequestedNote(),
                        "/admin/contracts/maintenance/" + c.getId()
                ));
            }
        });
    }

    private void addLeaveRequests(List<MyRequestResponse> rows, Long userId) {
        employeeRepo.findByLinkedUserId(userId).ifPresent(employee ->
                leaveRequestRepo.findByEmployeeIdOrderByCreatedAtDesc(employee.getId()).forEach(r -> rows.add(new MyRequestResponse(
                        "LEAVE_REQUEST",
                        r.getId(),
                        "LV-" + r.getId(),
                        "طلب إجازة",
                        r.getStartDate() + " - " + r.getEndDate(),
                        r.getStatus(),
                        leaveProgress(r.getStatus()),
                        r.getCreatedAt(),
                        "EMPLOYEE",
                        employee.getId(),
                        firstNonBlank(employee.getFullNameAr(), employee.getFullNameEn(), employee.getFullName()),
                        firstNonBlank(r.getRejectionReason(), r.getReason()),
                        "/admin/hr/leaves"
                ))));
    }

    private void addTenantPortalRequests(List<MyRequestResponse> rows, Long userId) {
        tenantRepo.findByUserId(userId).ifPresent(tenant -> {
            contractActionRequestRepo.findByTenantIdOrderByCreatedAtDesc(tenant.getId()).forEach(r -> rows.add(new MyRequestResponse(
                    "TENANT_CONTRACT_" + r.getActionType(),
                    r.getId(),
                    "TR-" + r.getId(),
                    "RENEWAL".equals(r.getActionType()) ? "طلب تجديد عقد" : "طلب إلغاء عقد",
                    "طلب مقدم من بوابة المستأجر",
                    r.getStatus(),
                    tenantActionProgress(r.getStatus()),
                    r.getCreatedAt(),
                    "CONTRACT",
                    r.getContractId(),
                    firstNonBlank(tenant.getFullName(), tenant.getEmail()),
                    firstNonBlank(r.getAdminNotes(), r.getReason(), r.getNotes()),
                    "/tenant/contract-request"
            )));
            tenantComplaintRepo.findByTenantIdOrderByCreatedAtDesc(tenant.getId()).forEach(c -> rows.add(new MyRequestResponse(
                    "TENANT_COMPLAINT",
                    c.getId(),
                    "CP-" + c.getId(),
                    "شكوى مستأجر",
                    c.getTitle(),
                    c.getStatus(),
                    complaintProgress(c.getStatus()),
                    c.getCreatedAt(),
                    "PROPERTY",
                    c.getPropertyId(),
                    propertyLabel(c.getPropertyId()),
                    firstNonBlank(c.getResolution(), c.getDescription()),
                    "/tenant/complaints"
            )));
        });
    }

    private String propertyLabel(Long propertyId) {
        if (propertyId == null) return null;
        return propertyRepo.findById(propertyId)
                .map(p -> firstNonBlank(p.getPropertyNameAr(), p.getPropertyNameEn(), p.getPropertyName(), p.getPropertyCode()))
                .orElse("#" + propertyId);
    }

    private String contractSubject(LeaseContract c) {
        return propertyLabel(c.getPropertyId());
    }

    private String maintenanceProgress(String status) {
        if ("PENDING".equals(status)) return "تم تقديم الطلب وينتظر المراجعة";
        if ("ASSIGNED".equals(status)) return "تم تعيين الطلب لفريق الصيانة";
        if ("SCHEDULED".equals(status)) return "تم تحديد موعد للزيارة";
        if ("IN_PROGRESS".equals(status)) return "جار تنفيذ الطلب";
        if ("COMPLETED".equals(status)) return "تم إكمال الطلب";
        if ("CANCELLED".equals(status)) return "تم إلغاء الطلب";
        return "تم تسجيل الطلب";
    }

    private String ownerDecisionProgress(String status, LocalDateTime decisionAt) {
        if (decisionAt != null) return "تم تسجيل قرار المالك";
        if (status != null && status.startsWith("PENDING_")) return "بانتظار موافقة المالك";
        if ("TERMINATED".equals(status) || "RENEWED".equals(status)) return "تم تنفيذ الطلب";
        if ("ACTIVE".equals(status)) return "الطلب مغلق والعقد نشط";
        return "تم تسجيل الطلب";
    }

    private String leaveProgress(String status) {
        if ("APPROVED".equals(status)) return "تمت الموافقة على الإجازة";
        if ("REJECTED".equals(status)) return "تم رفض الإجازة";
        return "بانتظار مراجعة الإجازة";
    }

    private String tenantActionProgress(String status) {
        if ("APPROVED".equals(status)) return "وافق المالك وتم تنفيذ الطلب";
        if ("REJECTED".equals(status)) return "رفض المالك الطلب";
        return "بانتظار مراجعة الطلب";
    }

    private String complaintProgress(String status) {
        if ("RESOLVED".equals(status) || "CLOSED".equals(status)) return "تم إغلاق الشكوى";
        if ("IN_REVIEW".equals(status)) return "الشكوى قيد المراجعة";
        return "تم تسجيل الشكوى";
    }

    private LocalDateTime firstDate(LocalDateTime... values) {
        if (values == null) return null;
        for (LocalDateTime value : values) {
            if (value != null) return value;
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return null;
    }
}
