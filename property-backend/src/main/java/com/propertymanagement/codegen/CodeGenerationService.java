package com.propertymanagement.codegen;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;

import java.time.Year;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.unit.entity.Unit;

@Service
@RequiredArgsConstructor
public class CodeGenerationService {
  private final CodeGenerationStateRepository codeGenerationStateRepository;

  @Transactional
  public String generate(String codeType) {
    int currentYear = Year.now().getValue();
    CodeGenerationState state = codeGenerationStateRepository
            .findByCodeTypeAndYear(codeType, currentYear)
            .orElseGet(() -> {
              CodeGenerationState s = CodeGenerationState.builder()
                      .codeType(codeType)
                      .year(currentYear)
                      .lastNumber(0L)
                      .build();
              return codeGenerationStateRepository.save(s);
            });
    long next = state.getLastNumber() + 1;
    state.setLastNumber(next);
    codeGenerationStateRepository.save(state);

    // Year-based codes for MR/CNT/INV/REF/PAY etc. keep year in the string.
    switch (codeType.toUpperCase()) {
      case "MR": // Maintenance Request
      case "CNT": // Contract
      case "INV": // Invoice
      case "REF": // Generic reference
      case "PAY": // Payment reference
        return codeType.toUpperCase() + "-" + currentYear + "-" + String.format("%05d", next);
      case "UNIT":
      case "PROPERTY":
        // No year in these formats; keep a fixed 6-digit sequence
        return codeType.toUpperCase() + "-" + String.format("%06d", next);
      default:
        return codeType.toUpperCase() + "-" + String.format("%06d", next);
    }
  }
}
