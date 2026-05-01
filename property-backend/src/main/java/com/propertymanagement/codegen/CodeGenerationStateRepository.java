package com.propertymanagement.codegen;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface CodeGenerationStateRepository extends JpaRepository<CodeGenerationState, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CodeGenerationState> findByCodeTypeAndYear(String codeType, Integer year);
}
