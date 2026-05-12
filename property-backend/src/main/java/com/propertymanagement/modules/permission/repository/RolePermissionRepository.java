package com.propertymanagement.modules.permission.repository;

import com.propertymanagement.modules.permission.entity.RolePermissionEntity;
import com.propertymanagement.modules.user.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, UserRole> {
}
