package com.propertymanagement.modules.property.attachment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.property.attachment.entity.PropertyAttachment;

@Repository
public interface PropertyAttachmentRepository extends JpaRepository<PropertyAttachment, Long> {
    List<PropertyAttachment> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);
    Optional<PropertyAttachment> findByIdAndPropertyId(Long id, Long propertyId);
}
