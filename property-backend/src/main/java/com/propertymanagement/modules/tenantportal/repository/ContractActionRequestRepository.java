package com.propertymanagement.modules.tenantportal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.tenantportal.entity.ContractActionRequest;

import java.util.List;

public interface ContractActionRequestRepository extends JpaRepository<ContractActionRequest, Long> {
    boolean existsByTenantId(Long tenantId);

    List<ContractActionRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<ContractActionRequest> findByContractIdOrderByCreatedAtDesc(Long contractId);
    List<ContractActionRequest> findByContractIdAndActionTypeAndStatusOrderByCreatedAtDesc(Long contractId, String actionType, String status);
    List<ContractActionRequest> findByStatusOrderByCreatedAtDesc(String status);
}
