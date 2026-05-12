package com.propertymanagement.modules.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.entity.MaintenanceOfficerType;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    @Query("""
            SELECT u FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (:propertyIds IS NULL OR u.propertyId IN :propertyIds)
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.maintenanceCompanyName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<User> search(@Param("q") String q, @Param("role") UserRole role, @Param("propertyIds") List<Long> propertyIds, Pageable pageable);
    List<User> findByRoleAndActiveTrue(UserRole role);
    List<User> findByPropertyIdAndRoleAndActiveTrue(Long propertyId, UserRole role);

    @Query("""
            SELECT u FROM User u
            WHERE u.role = :role
              AND u.active = true
              AND u.propertyId = :propertyId
              AND u.contractorCompanyId = :companyId
            """)
    List<User> findAssignableContractorOfficers(
            @Param("role") UserRole role,
            @Param("propertyId") Long propertyId,
            @Param("companyId") Long companyId);

    @Query("""
            SELECT u FROM User u
            WHERE u.active = true
              AND u.propertyId = :propertyId
              AND u.contractorCompanyId = :companyId
              AND (
                    u.role = com.propertymanagement.modules.user.entity.UserRole.MAINTENANCE_COMPANY
                    OR (u.role = com.propertymanagement.modules.user.entity.UserRole.MAINTENANCE_OFFICER_COMPANY
                        AND u.maintenanceOfficerType = com.propertymanagement.modules.user.entity.MaintenanceOfficerType.CONTRACTOR_COMPANY)
              )
            """)
    List<User> findActiveContractorStaffForProperty(
            @Param("propertyId") Long propertyId,
            @Param("companyId") Long companyId);
}
