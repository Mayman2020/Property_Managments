package com.propertymanagement.modules.tenantportal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractActionRequestRepository extends JpaRepository<ContractActionRequest, Long> {
    boolean existsByTenantId(Long tenantId);

    List<ContractActionRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<ContractActionRequest> findByContractIdOrderByCreatedAtDesc(Long contractId);
    List<ContractActionRequest> findByStatusOrderByCreatedAtDesc(String status);
}
