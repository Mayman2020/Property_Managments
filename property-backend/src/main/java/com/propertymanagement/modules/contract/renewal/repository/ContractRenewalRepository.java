package com.propertymanagement.modules.contract.renewal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.contract.renewal.entity.ContractRenewal;

import java.util.List;
import java.util.Optional;

public interface ContractRenewalRepository extends JpaRepository<ContractRenewal, Long> {
    List<ContractRenewal> findByOriginalContractId(Long originalContractId);
    Optional<ContractRenewal> findByNewContractId(Long newContractId);
    Optional<ContractRenewal> findFirstByOriginalContractIdOrderByCreatedAtDesc(Long originalContractId);
}
