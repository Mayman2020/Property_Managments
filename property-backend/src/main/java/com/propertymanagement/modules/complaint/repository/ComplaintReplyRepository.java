package com.propertymanagement.modules.complaint.repository;

import com.propertymanagement.modules.complaint.entity.ComplaintReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintReplyRepository extends JpaRepository<ComplaintReply, Long> {
    List<ComplaintReply> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
}
