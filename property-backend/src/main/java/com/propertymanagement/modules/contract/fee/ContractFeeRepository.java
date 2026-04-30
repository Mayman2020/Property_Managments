package com.propertymanagement.modules.contract.fee;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractFeeRepository extends JpaRepository<ContractFee, Long> {
    List<ContractFee> findByContractId(Long contractId);
}
