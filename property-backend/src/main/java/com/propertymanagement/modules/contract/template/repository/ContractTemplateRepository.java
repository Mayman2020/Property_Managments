package com.propertymanagement.modules.contract.template.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.propertymanagement.modules.contract.template.entity.ContractTemplate;

public interface ContractTemplateRepository extends JpaRepository<ContractTemplate, Long> {
    Page<ContractTemplate> findAll(Pageable pageable);
    List<ContractTemplate> findByIsActiveTrue();
}
