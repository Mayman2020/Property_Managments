package com.propertymanagement.modules.contractor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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

    @Query("""
            SELECT DISTINCT c FROM ContractorCompany c
            WHERE c.active = true
              AND (
                EXISTS (
                  SELECT 1 FROM MaintenanceContract mc
                  WHERE mc.contractorCompanyId = c.id
                    AND mc.propertyId IN :propertyIds
                )
                OR EXISTS (
                  SELECT 1 FROM Property p
                  WHERE p.active = true
                    AND p.maintenanceContractorCompanyId = c.id
                    AND p.id IN :propertyIds
                )
              )
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
    List<ContractorCompany> searchActiveInPropertyIds(@Param("q") String q, @Param("propertyIds") Collection<Long> propertyIds);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompany c
            WHERE (
                EXISTS (
                  SELECT 1 FROM MaintenanceContract mc
                  WHERE mc.contractorCompanyId = c.id
                    AND mc.propertyId IN :propertyIds
                )
                OR EXISTS (
                  SELECT 1 FROM Property p
                  WHERE p.active = true
                    AND p.maintenanceContractorCompanyId = c.id
                    AND p.id IN :propertyIds
                )
              )
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
    List<ContractorCompany> searchAllInPropertyIds(@Param("q") String q, @Param("propertyIds") Collection<Long> propertyIds);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompany c
            WHERE c.active = true
              AND (
                EXISTS (
                  SELECT 1 FROM MaintenanceContract mc
                  WHERE mc.contractorCompanyId = c.id
                    AND mc.propertyId = :propertyId
                )
                OR EXISTS (
                  SELECT 1 FROM Property p
                  WHERE p.active = true
                    AND p.maintenanceContractorCompanyId = c.id
                    AND p.id = :propertyId
                )
              )
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
    List<ContractorCompany> searchActiveInPropertyId(@Param("q") String q, @Param("propertyId") Long propertyId);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompany c
            WHERE (
                EXISTS (
                  SELECT 1 FROM MaintenanceContract mc
                  WHERE mc.contractorCompanyId = c.id
                    AND mc.propertyId = :propertyId
                )
                OR EXISTS (
                  SELECT 1 FROM Property p
                  WHERE p.active = true
                    AND p.maintenanceContractorCompanyId = c.id
                    AND p.id = :propertyId
                )
              )
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
    List<ContractorCompany> searchAllInPropertyId(@Param("q") String q, @Param("propertyId") Long propertyId);

    @Query("""
            SELECT COUNT(DISTINCT c) FROM ContractorCompany c
            WHERE c.id = :companyId
              AND (
                EXISTS (
                  SELECT 1 FROM MaintenanceContract mc
                  WHERE mc.contractorCompanyId = c.id
                    AND mc.propertyId IN :propertyIds
                )
                OR EXISTS (
                  SELECT 1 FROM Property p
                  WHERE p.active = true
                    AND p.maintenanceContractorCompanyId = c.id
                    AND p.id IN :propertyIds
                )
              )
            """)
    long countLinkedToPropertyIds(@Param("companyId") Long companyId, @Param("propertyIds") Collection<Long> propertyIds);
}
