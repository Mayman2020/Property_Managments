package com.propertymanagement.modules.hr.employee;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Query("""
            SELECT e FROM Employee e
            WHERE (:propertyId IS NULL OR e.propertyId = :propertyId)
              AND (:q IS NULL OR :q = '' OR
                   LOWER(COALESCE(e.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.employeeCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.jobTitleAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(e.jobTitleEn, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Employee> search(@Param("q") String q, @Param("propertyId") Long propertyId, Pageable pageable);

    List<Employee> findByPropertyIdAndStatusOrderByFullNameAsc(Long propertyId, String status);
}
