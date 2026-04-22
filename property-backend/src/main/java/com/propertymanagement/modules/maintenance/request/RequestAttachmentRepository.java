package com.propertymanagement.modules.maintenance.request;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestAttachmentRepository extends JpaRepository<RequestAttachment, Long> {
    List<RequestAttachment> findByRequestId(Long requestId);
    void deleteByRequestId(Long requestId);
}
