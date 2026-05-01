package com.propertymanagement.codegen;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "code_generation_state", uniqueConstraints = @UniqueConstraint(columnNames = {"code_type", "year"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CodeGenerationState {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "code_type", nullable = false, length = 20)
  private String codeType;

  @Column(nullable = false)
  private Integer year;

  @Column(name = "last_number", nullable = false)
  private Long lastNumber;
}
