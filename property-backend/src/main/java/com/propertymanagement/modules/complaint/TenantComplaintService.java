package com.propertymanagement.modules.complaint;

import com.propertymanagement.modules.complaint.dto.ComplaintRequest;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TenantComplaintService {

    private final TenantComplaintRepository complaintRepository;

    public Page<TenantComplaint> getAll(Pageable pageable) {
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
        TenantComplaint complaint = findById(id);
        complaint.setAssignedTo(officerId);
        complaint.setStatus("IN_REVIEW");
        return complaintRepository.save(complaint);
    }

    @Transactional
    public TenantComplaint resolve(Long id, String resolution) {
        TenantComplaint complaint = findById(id);
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
