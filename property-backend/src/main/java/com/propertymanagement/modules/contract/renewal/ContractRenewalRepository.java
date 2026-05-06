package com.propertymanagement.modules.contract.renewal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContractRenewalRepository extends JpaRepository<ContractRenewal, Long> {
    List<ContractRenewal> findByOriginalContractId(Long originalContractId);
    Optional<ContractRenewal> findByNewContractId(Long newContractId);
    Optional<ContractRenewal> findFirstByOriginalContractIdOrderByCreatedAtDesc(Long originalContractId);
}
