package com.propertymanagement.modules.contractor.repository;

import com.propertymanagement.modules.contractor.entity.ContractorCompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;
import com.propertymanagement.modules.property.entity.Property;

public interface ContractorCompanyRepository extends JpaRepository<ContractorCompanyEntity, Long> {
    List<ContractorCompanyEntity> findByActiveTrueOrderByNameAsc();

    @Query("""
            SELECT c FROM ContractorCompanyEntity c
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
    List<ContractorCompanyEntity> searchActive(@Param("q") String q);

    @Query("""
            SELECT c FROM ContractorCompanyEntity c
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
    List<ContractorCompanyEntity> searchAll(@Param("q") String q);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompanyEntity c
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
    List<ContractorCompanyEntity> searchActiveInPropertyIds(@Param("q") String q, @Param("propertyIds") Collection<Long> propertyIds);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompanyEntity c
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
    List<ContractorCompanyEntity> searchAllInPropertyIds(@Param("q") String q, @Param("propertyIds") Collection<Long> propertyIds);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompanyEntity c
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
    List<ContractorCompanyEntity> searchActiveInPropertyId(@Param("q") String q, @Param("propertyId") Long propertyId);

    @Query("""
            SELECT DISTINCT c FROM ContractorCompanyEntity c
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
    List<ContractorCompanyEntity> searchAllInPropertyId(@Param("q") String q, @Param("propertyId") Long propertyId);

    @Query("""
            SELECT COUNT(DISTINCT c) FROM ContractorCompanyEntity c
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
