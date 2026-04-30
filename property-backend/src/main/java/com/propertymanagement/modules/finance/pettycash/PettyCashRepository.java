package com.propertymanagement.modules.finance.pettycash;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PettyCashRepository extends JpaRepository<PettyCashFund, Long> {
    List<PettyCashFund> findByActiveTrueOrderByIdDesc();
    List<PettyCashFund> findByPropertyIdAndActiveTrueOrderByIdDesc(Long propertyId);
}
