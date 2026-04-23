package com.propertymanagement.modules.permission;

import com.propertymanagement.modules.user.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UserRole> {
}
