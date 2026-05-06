package com.propertymanagement.modules.complaint;

import com.propertymanagement.modules.complaint.dto.ComplaintRequest;
import com.propertymanagement.modules.owner.OwnerPropertyAccessService;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TenantComplaintService {

    private final TenantComplaintRepository complaintRepository;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public Page<TenantComplaint> getAll(Pageable pageable) {
        Set<Long> ownerScope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
        if (ownerScope != null) {
            if (ownerScope.isEmpty()) {
                return Page.empty(pageable);
            }
            return complaintRepository.findByPropertyIdIn(ownerScope, pageable);
        }
        return complaintRepository.findAll(pageable);
    }

    @Transactional
    public TenantComplaint create(ComplaintRequest request) {
        TenantComplaint complaint = TenantComplaint.builder()
                .tenantId(request.getTenantId())
                .unitId(request.getUnitId())
                .propertyId(request.getPropertyId())
                .complaintType(request.getComplaintType())
                .title(request.getTitle())
                .description(request.getDescription())
                .status("OPEN")
                .priority(request.getPriority() != null ? request.getPriority() : "NORMAL")
                .attachmentUrl(request.getAttachmentUrl())
                .build();
        return complaintRepository.save(complaint);
    }

    @Transactional
    public TenantComplaint assign(Long id, Long officerId) {
        ownerPropertyAccessService.denyOwnerMutation("Owners cannot assign complaints to staff");
        TenantComplaint complaint = findById(id);
        complaint.setAssignedTo(officerId);
        complaint.setStatus("IN_REVIEW");
        return complaintRepository.save(complaint);
    }

    @Transactional
    public TenantComplaint resolve(Long id, String resolution) {
        TenantComplaint complaint = findById(id);
        ownerPropertyAccessService.assertOwnerCanAccessProperty(complaint.getPropertyId());
        complaint.setStatus("RESOLVED");
        complaint.setResolution(resolution);
        complaint.setResolvedAt(LocalDateTime.now());
        return complaintRepository.save(complaint);
    }

    private TenantComplaint findById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Complaint not found: " + id));
    }
}
