package com.propertymanagement.modules.complaint.repository;

import com.propertymanagement.modules.complaint.entity.ComplaintAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintAttachmentRepository extends JpaRepository<ComplaintAttachment, Long> {
    List<ComplaintAttachment> findByComplaintIdOrderByUploadedAtAsc(Long complaintId);
    void deleteByComplaintId(Long complaintId);
}
