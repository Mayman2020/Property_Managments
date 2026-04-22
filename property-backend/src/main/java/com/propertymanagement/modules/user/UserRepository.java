package com.propertymanagement.modules.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    @Query("""
            SELECT u FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.maintenanceCompanyName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<User> search(@Param("q") String q, @Param("role") UserRole role, Pageable pageable);
    List<User> findByRoleAndActiveTrue(UserRole role);
    List<User> findByPropertyIdAndRoleAndActiveTrue(Long propertyId, UserRole role);
}
