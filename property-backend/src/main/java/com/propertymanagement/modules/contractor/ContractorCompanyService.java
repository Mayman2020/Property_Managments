package com.propertymanagement.modules.contractor;

import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequest;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractorCompanyService {

    private final ContractorCompanyRepository repository;

    public List<ContractorCompanyResponse> listActive() {
        return repository.findByActiveTrueOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    public List<ContractorCompanyResponse> listAll() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    public ContractorCompanyResponse get(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public ContractorCompanyResponse create(ContractorCompanyRequest dto) {
        ContractorCompany e = ContractorCompany.builder()
                .name(dto.getName().trim())
                .phone(blankToNull(dto.getPhone()))
                .email(blankToNull(dto.getEmail()))
                .notes(blankToNull(dto.getNotes()))
                .active(dto.getActive() == null || dto.getActive())
                .build();
        return toResponse(repository.save(e));
    }

    @Transactional
    public ContractorCompanyResponse update(Long id, ContractorCompanyRequest dto) {
        ContractorCompany e = find(id);
        e.setName(dto.getName().trim());
        e.setPhone(blankToNull(dto.getPhone()));
        e.setEmail(blankToNull(dto.getEmail()));
        e.setNotes(blankToNull(dto.getNotes()));
        if (dto.getActive() != null) {
            e.setActive(dto.getActive());
        }
        return toResponse(repository.save(e));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw AppException.notFound("Contractor company not found: " + id);
        }
        repository.deleteById(id);
    }

    private ContractorCompany find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Contractor company not found: " + id));
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private ContractorCompanyResponse toResponse(ContractorCompany e) {
        return ContractorCompanyResponse.builder()
                .id(e.getId())
                .name(e.getName())
                .phone(e.getPhone())
                .email(e.getEmail())
                .notes(e.getNotes())
                .active(e.isActive())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
