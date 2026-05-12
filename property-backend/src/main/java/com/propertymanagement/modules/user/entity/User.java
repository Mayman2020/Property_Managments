package com.propertymanagement.modules.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @Column(unique = true, nullable = false, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String password;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "full_name_ar", length = 150)
    private String fullNameAr;

    @Column(name = "full_name_en", length = 150)
    private String fullNameEn;

    @Column(length = 20)
    private String phone;

    @Column(name = "profile_image_url", length = 600)
    private String profileImageUrl;

    @Column(name = "civil_id_image_url", length = 600)
    private String civilIdImageUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    /** Comma-separated {@link UserRole} names in addition to {@link #role}; merged into {@link #getAuthorities()}. */
    @Column(name = "extra_roles", length = 500)
    private String extraRoles;

    @Column(name = "property_id")
    private Long propertyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_officer_type", length = 30)
    private MaintenanceOfficerType maintenanceOfficerType;

    @Column(name = "maintenance_company_name", length = 180)
    private String maintenanceCompanyName;

    @Column(name = "contractor_company_id")
    private Long contractorCompanyId;

    @Builder.Default
    @Column(name = "is_active")
    private boolean active = true;

    /** When true the user must change their temporary password before accessing the system. */
    @Builder.Default
    @Column(name = "must_change_password")
    private boolean mustChangePassword = true;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @CreatedDate
    @Column(name = "created_on", updatable = false)
    private LocalDateTime createdOn;

    @LastModifiedBy
    @Column(name = "modified_by")
    private Long modifiedBy;

    @LastModifiedDate
    @Column(name = "modified_on")
    private LocalDateTime modifiedOn;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Extra portal roles (excluding {@link #role} duplicate). */
    public List<UserRole> getExtraRolesList() {
        return UserExtraRoles.parseList(extraRoles);
    }

    /** Primary plus extras, unique, primary first. */
    public List<UserRole> getAllAssignedRoles() {
        LinkedHashSet<UserRole> set = new LinkedHashSet<>();
        if (role != null) {
            set.add(role);
        }
        for (UserRole r : getExtraRolesList()) {
            if (r != null) {
                set.add(r);
            }
        }
        return new ArrayList<>(set);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        LinkedHashSet<SimpleGrantedAuthority> authorities = new LinkedHashSet<>();
        if (role != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        }
        for (UserRole r : getExtraRolesList()) {
            if (r != null && r != role) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + r.name()));
            }
        }
        return new ArrayList<>(authorities);
    }

    @Override public boolean isAccountNonExpired()  { return true; }
    @Override public boolean isAccountNonLocked()   { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return active; }
    @Override public String getUsername() { return email; }
}
