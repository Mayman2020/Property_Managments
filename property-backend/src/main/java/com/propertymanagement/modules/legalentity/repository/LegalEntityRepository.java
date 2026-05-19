package com.propertymanagement.modules.legalentity.repository;

import com.propertymanagement.modules.legalentity.entity.LegalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LegalEntityRepository extends JpaRepository<LegalEntity, Long> {
    List<LegalEntity> findAllByOrderByNameArAsc();
    List<LegalEntity> findByActiveTrueOrderByNameArAsc();
}
