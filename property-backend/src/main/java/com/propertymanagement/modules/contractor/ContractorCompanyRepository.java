package com.propertymanagement.modules.contractor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ContractorCompanyRepository extends JpaRepository<ContractorCompany, Long> {
    List<ContractorCompany> findByActiveTrueOrderByNameAsc();

    @Query("""
            SELECT c FROM ContractorCompany c
            WHERE c.active = true
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.nameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.nameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.phone, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY c.name ASC
            """)
    List<ContractorCompany> searchActive(@Param("q") String q);

    @Query("""
            SELECT c FROM ContractorCompany c
            WHERE (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.nameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.nameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.phone, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY c.name ASC
            """)
    List<ContractorCompany> searchAll(@Param("q") String q);
}
