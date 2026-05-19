package com.propertymanagement.modules.contract.annex.repository;

import com.propertymanagement.modules.contract.annex.entity.ContractAnnex;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractAnnexRepository extends JpaRepository<ContractAnnex, Long> {
    List<ContractAnnex> findByContractIdOrderByCreatedAtAsc(Long contractId);
}
