package com.propertymanagement.modules.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_property_access")
@IdClass(UserPropertyAccessId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserPropertyAccess {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "property_id", nullable = false)
    private Long propertyId;
}
