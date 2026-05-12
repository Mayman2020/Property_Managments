package com.propertymanagement.modules.contract.fee.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.propertymanagement.modules.contract.fee.entity.ContractFee;

public interface ContractFeeRepository extends JpaRepository<ContractFee, Long> {
    List<ContractFee> findByContractId(Long contractId);
}
