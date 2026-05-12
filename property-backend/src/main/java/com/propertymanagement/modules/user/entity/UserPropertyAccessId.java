package com.propertymanagement.modules.user.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPropertyAccessId implements Serializable {
    private Long userId;
    private Long propertyId;
}
