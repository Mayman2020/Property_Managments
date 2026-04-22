package com.propertymanagement.modules.contractor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractorCompanyRepository extends JpaRepository<ContractorCompany, Long> {
    List<ContractorCompany> findByActiveTrueOrderByNameAsc();
}
