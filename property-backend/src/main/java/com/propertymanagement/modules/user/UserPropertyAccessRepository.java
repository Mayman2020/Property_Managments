package com.propertymanagement.modules.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserPropertyAccessRepository extends JpaRepository<UserPropertyAccess, UserPropertyAccessId> {

    @Query("SELECT u.propertyId FROM UserPropertyAccess u WHERE u.userId = :userId ORDER BY u.propertyId ASC")
    List<Long> findPropertyIdsByUserId(@Param("userId") Long userId);
}
