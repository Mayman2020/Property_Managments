package com.propertymanagement.modules.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.propertymanagement.modules.user.entity.UserPropertyAccess;
import com.propertymanagement.modules.user.entity.UserPropertyAccessId;

import java.util.List;

public interface UserPropertyAccessRepository extends JpaRepository<UserPropertyAccess, UserPropertyAccessId> {

    @Query("SELECT u.propertyId FROM UserPropertyAccess u WHERE u.userId = :userId ORDER BY u.propertyId ASC")
    List<Long> findPropertyIdsByUserId(@Param("userId") Long userId);
}
