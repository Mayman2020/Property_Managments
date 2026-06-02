package com.propertymanagement.modules.hr.leave.service;

import com.propertymanagement.modules.hr.leave.dto.LeaveRequestResponse;
import com.propertymanagement.modules.hr.leave.dto.CreateLeaveRequest;
import com.propertymanagement.modules.hr.leave.dto.EmployeeLeaveBalanceResponse;
import com.propertymanagement.modules.hr.leave.dto.LeaveDecisionRequest;
import com.propertymanagement.modules.hr.employee.entity.Employee;
import com.propertymanagement.modules.hr.employee.repository.EmployeeRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.property.service.PropertyOwnerPortalRecipientService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import com.propertymanagement.modules.hr.leave.entity.LeaveRequestEntity;
import com.propertymanagement.modules.hr.leave.repository.LeaveQueryRepository;
import com.propertymanagement.modules.hr.leave.repository.LeaveRequestRepository;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private static final int ANNUAL_ENTITLED_DAYS = 30;
    private final LeaveQueryRepository queryRepository;
    private final LeaveRequestRepository repository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PropertyOwnerPortalRecipientService propertyOwnerPortalRecipientService;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public Page<LeaveRequestResponse> getAll(Pageable pageable) {
        User actor = currentUser();
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) return Page.empty(pageable);
            return queryRepository.findAllRowsByPropertyIds(ownerScope, pageable).map(this::toResponse);
        }
        if (actor.getPropertyId() != null && (actor.getRole() == UserRole.ACCOUNTANT || actor.getRole() == UserRole.HR_OFFICER || actor.getRole() == UserRole.PROCEDURES_CLERK)) {
            return queryRepository.findAllRowsByPropertyId(actor.getPropertyId(), pageable).map(this::toResponse);
        }
        return queryRepository.findAllRows(pageable).map(this::toResponse);
    }

    public LeaveRequestResponse getById(Long id) {
        LeaveRequestEntity entity = find(id);
        Employee employee = employeeRepository.findById(entity.getEmployeeId())
                .orElseThrow(() -> AppException.notFound("Employee not found"));
        assertUserCanAccessProperty(employee.getPropertyId(), currentUser());
        return toResponse(entity);
    }

    public List<EmployeeLeaveBalanceResponse> balancesForProperty(Long propertyId, Integer year) {
        User user = currentUser();
        Long targetPropertyId = propertyId != null ? propertyId : user.getPropertyId();
        if (targetPropertyId == null) {
            throw AppException.badRequest("propertyId is required");
        }
        assertUserCanAccessProperty(targetPropertyId, user);
        int targetYear = year != null ? year : LocalDate.now().getYear();
        List<Employee> employees = employeeRepository.findByPropertyIdAndStatusOrderByFullNameAsc(targetPropertyId, "ACTIVE");
        return employees.stream()
                .map(employee -> buildBalance(employee.getId(), targetYear))
                .collect(Collectors.toList());
    }

    @Transactional
    public LeaveRequestResponse create(CreateLeaveRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> AppException.badRequest("Employee not found: " + request.getEmployeeId()));
        assertUserCanAccessProperty(employee.getPropertyId(), currentUser());
        validateRange(request.getStartDate(), request.getEndDate());
        if (repository.existsOverlappingActiveRequest(employee.getId(), request.getStartDate(), request.getEndDate())) {
            throw AppException.badRequest("There is an overlapping leave request for this employee");
        }
        int requestedDays = (int) ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        int year = request.getStartDate().getYear();
        int usedDays = repository.sumApprovedDaysByEmployeeAndYear(employee.getId(), year);
        if (usedDays + requestedDays > ANNUAL_ENTITLED_DAYS) {
            throw AppException.badRequest("Insufficient annual leave balance");
        }
        LeaveRequestEntity entity = new LeaveRequestEntity();
        entity.setEmployeeId(employee.getId());
        entity.setLeaveTypeId(request.getLeaveTypeId());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setDaysCount(requestedDays);
        entity.setReason(trimToNull(request.getReason()));
        entity.setAttachmentUrl(trimToNull(request.getAttachmentUrl()));
        LeaveRequestEntity saved = repository.save(entity);
        notifyLeaveSubmitted(saved, employee);
        return toResponse(saved);
    }

    @Transactional
    public LeaveRequestResponse update(Long id, CreateLeaveRequest request) {
        LeaveRequestEntity entity = find(id);
        if (!"PENDING".equalsIgnoreCase(entity.getStatus())) {
            throw AppException.badRequest("Only pending leave requests can be updated");
        }
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> AppException.badRequest("Employee not found: " + request.getEmployeeId()));
        assertUserCanAccessProperty(employee.getPropertyId(), currentUser());
        validateRange(request.getStartDate(), request.getEndDate());
        if (repository.existsOverlappingActiveRequestExcluding(id, employee.getId(), request.getStartDate(), request.getEndDate())) {
            throw AppException.badRequest("There is an overlapping leave request for this employee");
        }
        int requestedDays = (int) ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        int year = request.getStartDate().getYear();
        int usedDays = repository.sumApprovedDaysByEmployeeAndYear(employee.getId(), year);
        if (usedDays + requestedDays > ANNUAL_ENTITLED_DAYS) {
            throw AppException.badRequest("Insufficient annual leave balance");
        }
        entity.setEmployeeId(employee.getId());
        entity.setLeaveTypeId(request.getLeaveTypeId());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setDaysCount(requestedDays);
        entity.setReason(trimToNull(request.getReason()));
        entity.setAttachmentUrl(trimToNull(request.getAttachmentUrl()));
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        LeaveRequestEntity entity = find(id);
        if (!"PENDING".equalsIgnoreCase(entity.getStatus())) {
            throw AppException.badRequest("Only pending leave requests can be deleted");
        }
        Employee employee = employeeRepository.findById(entity.getEmployeeId())
                .orElseThrow(() -> AppException.notFound("Employee not found"));
        assertUserCanAccessProperty(employee.getPropertyId(), currentUser());
        repository.delete(entity);
    }

    @Transactional
    public LeaveRequestResponse approve(Long id, LeaveDecisionRequest request) {
        LeaveRequestEntity entity = find(id);
        if (!"PENDING".equalsIgnoreCase(entity.getStatus())) {
            throw AppException.badRequest("Only pending leave requests can be approved");
        }
        User actor = currentUser();
        if (actor.getRole() != UserRole.OWNER && actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.GENERAL_MANAGER && actor.getRole() != UserRole.HR_OFFICER) {
            throw AppException.forbidden("Only owner, super admin, or general manager can approve leave requests");
        }
        Employee employee = employeeRepository.findById(entity.getEmployeeId())
                .orElseThrow(() -> AppException.badRequest("Employee not found"));
        assertUserCanAccessProperty(employee.getPropertyId(), actor);
        int usedDays = repository.sumApprovedDaysByEmployeeAndYear(employee.getId(), entity.getStartDate().getYear());
        if (usedDays + entity.getDaysCount() > ANNUAL_ENTITLED_DAYS) {
            throw AppException.badRequest("Insufficient annual leave balance");
        }
        entity.setStatus("APPROVED");
        entity.setApprovedBy(actor.getId());
        entity.setApprovedAt(LocalDateTime.now());
        entity.setRejectionReason(trimToNull(request.getNote()));
        LeaveRequestEntity saved = repository.save(entity);
        notifyLeaveApproved(saved, employee);
        return toResponse(saved);
    }

    @Transactional
    public LeaveRequestResponse reject(Long id, LeaveDecisionRequest request) {
        LeaveRequestEntity entity = find(id);
        if (!"PENDING".equalsIgnoreCase(entity.getStatus())) {
            throw AppException.badRequest("Only pending leave requests can be rejected");
        }
        User actor = currentUser();
        if (actor.getRole() != UserRole.OWNER && actor.getRole() != UserRole.SUPER_ADMIN && actor.getRole() != UserRole.GENERAL_MANAGER && actor.getRole() != UserRole.HR_OFFICER) {
            throw AppException.forbidden("Only owner, super admin, or general manager can reject leave requests");
        }
        Employee employee = employeeRepository.findById(entity.getEmployeeId())
                .orElseThrow(() -> AppException.badRequest("Employee not found"));
        assertUserCanAccessProperty(employee.getPropertyId(), actor);
        entity.setStatus("REJECTED");
        entity.setApprovedBy(actor.getId());
        entity.setApprovedAt(LocalDateTime.now());
        entity.setRejectionReason(trimToNull(request.getNote()));
        LeaveRequestEntity saved = repository.save(entity);
        notifyLeaveRejected(saved, employee);
        return toResponse(saved);
    }

    private LeaveRequestEntity find(Long id) {
        return repository.findById(id).orElseThrow(() -> AppException.notFound("Leave request not found: " + id));
    }

    private LeaveRequestResponse toResponse(LeaveQueryRepository.LeaveRow row) {
        return LeaveRequestResponse.builder()
                .id(row.getId())
                .employeeId(row.getEmployeeId())
                .leaveTypeId(row.getLeaveTypeId())
                .employeeName(row.getEmployeeName())
                .leaveTypeName(row.getLeaveTypeName())
                .startDate(row.getStartDate())
                .endDate(row.getEndDate())
                .daysCount(row.getDaysCount())
                .status(row.getStatus())
                .reason(row.getReason())
                .rejectionReason(row.getRejectionReason())
                .build();
    }

    private LeaveRequestResponse toResponse(LeaveRequestEntity entity) {
        LeaveQueryRepository.LeaveRow row = queryRepository.findRowById(entity.getId())
                .orElseThrow(() -> AppException.notFound("Leave request not found: " + entity.getId()));
        return toResponse(row);
    }

    private EmployeeLeaveBalanceResponse buildBalance(Long employeeId, int year) {
        int usedDays = repository.sumApprovedDaysByEmployeeAndYear(employeeId, year);
        int remaining = Math.max(0, ANNUAL_ENTITLED_DAYS - usedDays);
        return EmployeeLeaveBalanceResponse.builder()
                .employeeId(employeeId)
                .year(year)
                .entitledDays(ANNUAL_ENTITLED_DAYS)
                .usedDays(usedDays)
                .remainingDays(remaining)
                .build();
    }

    private void validateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw AppException.badRequest("Start and end dates are required");
        }
        if (endDate.isBefore(startDate)) {
            throw AppException.badRequest("End date must be on or after start date");
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private List<Long> propertyAccountants(Long propertyId) {
        if (propertyId == null) return List.of();
        return userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT).stream()
                .map(User::getId)
                .distinct()
                .collect(Collectors.toList());
    }

    private void notifyLeaveSubmitted(LeaveRequestEntity leave, Employee employee) {
        List<Long> recipients = new ArrayList<>();
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(employee.getPropertyId()));
        recipients.addAll(propertyAccountants(employee.getPropertyId()));
        notificationService.createForRecipients(
                recipients.stream().distinct().collect(Collectors.toList()),
                currentUser().getId(),
                employee.getPropertyId(),
                leave.getId(),
                NotificationType.LEAVE_REQUEST_SUBMITTED,
                "Leave request submitted",
                "A leave request was submitted for " + employee.getFullName()
        );
    }

    private void notifyLeaveApproved(LeaveRequestEntity leave, Employee employee) {
        List<Long> recipients = new ArrayList<>(propertyAccountants(employee.getPropertyId()));
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(employee.getPropertyId()));
        if (employee.getLinkedUserId() != null) {
            recipients.add(employee.getLinkedUserId());
        }
        notificationService.createForRecipients(
                recipients.stream().distinct().collect(Collectors.toList()),
                currentUser().getId(),
                employee.getPropertyId(),
                leave.getId(),
                NotificationType.LEAVE_REQUEST_APPROVED,
                "Leave request approved",
                "Leave request approved for " + employee.getFullName()
        );
    }

    private void notifyLeaveRejected(LeaveRequestEntity leave, Employee employee) {
        List<Long> recipients = new ArrayList<>(propertyAccountants(employee.getPropertyId()));
        recipients.addAll(propertyOwnerPortalRecipientService.portalRecipientUserIds(employee.getPropertyId()));
        if (employee.getLinkedUserId() != null) {
            recipients.add(employee.getLinkedUserId());
        }
        notificationService.createForRecipients(
                recipients.stream().distinct().collect(Collectors.toList()),
                currentUser().getId(),
                employee.getPropertyId(),
                leave.getId(),
                NotificationType.LEAVE_REQUEST_REJECTED,
                "Leave request rejected",
                "Leave request rejected for " + employee.getFullName()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private void assertUserCanAccessProperty(Long propertyId, User user) {
        if (propertyId == null || user == null) return;
        if (user.getRole() == UserRole.SUPER_ADMIN || user.getRole() == UserRole.GENERAL_MANAGER) {
            return;
        }
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (!ownerScope.contains(propertyId)) {
                throw AppException.forbidden("You do not have access to this property");
            }
            return;
        }
        if ((user.getRole() == UserRole.ACCOUNTANT || user.getRole() == UserRole.HR_OFFICER || user.getRole() == UserRole.PROCEDURES_CLERK)
                && user.getPropertyId() != null
                && user.getPropertyId().equals(propertyId)) {
            return;
        }
        // Other scoped roles are blocked from cross-property leave access.
        if (user.getRole() == UserRole.ACCOUNTANT || user.getRole() == UserRole.HR_OFFICER || user.getRole() == UserRole.PROCEDURES_CLERK || user.getRole() == UserRole.OWNER) {
            throw AppException.forbidden("You do not have access to this property");
        }
    }
}
