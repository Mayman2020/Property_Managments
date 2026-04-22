package com.propertymanagement.modules.contractor;

import com.propertymanagement.modules.contractor.dto.ContractorCompanyRequest;
import com.propertymanagement.modules.contractor.dto.ContractorCompanyResponse;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.i18n.LocalizedNameResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractorCompanyService {

    private final ContractorCompanyRepository repository;

    public List<ContractorCompanyResponse> listActive(String q) {
        return repository.searchActive(trimToNull(q)).stream().map(this::toResponse).toList();
    }

    public List<ContractorCompanyResponse> listAll(String q) {
        return repository.searchAll(trimToNull(q)).stream().map(this::toResponse).toList();
    }

    public ContractorCompanyResponse get(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public ContractorCompanyResponse create(ContractorCompanyRequest dto) {
        String nameAr = firstNonBlank(dto.getNameAr(), dto.getName(), dto.getNameEn());
        String nameEn = firstNonBlank(dto.getNameEn(), dto.getName(), dto.getNameAr());
        String legacyName = firstNonBlank(dto.getName(), nameAr, nameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Contractor name is required in Arabic and English");
        }
        ContractorCompany e = ContractorCompany.builder()
                .name(legacyName)
                .nameAr(nameAr)
                .nameEn(nameEn)
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
        String nameAr = firstNonBlank(dto.getNameAr(), dto.getName(), dto.getNameEn());
        String nameEn = firstNonBlank(dto.getNameEn(), dto.getName(), dto.getNameAr());
        String legacyName = firstNonBlank(dto.getName(), nameAr, nameEn);
        if (!LocalizedNameResolver.notBlank(legacyName)) {
            throw AppException.badRequest("Contractor name is required in Arabic and English");
        }
        e.setName(legacyName);
        e.setNameAr(nameAr);
        e.setNameEn(nameEn);
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
        String nameAr = firstNonBlank(e.getNameAr(), e.getName(), e.getNameEn());
        String nameEn = firstNonBlank(e.getNameEn(), e.getName(), e.getNameAr());
        return ContractorCompanyResponse.builder()
                .id(e.getId())
                .name(LocalizedNameResolver.resolve(nameAr, nameEn, e.getName()))
                .nameAr(nameAr)
                .nameEn(nameEn)
                .phone(e.getPhone())
                .email(e.getEmail())
                .notes(e.getNotes())
                .active(e.isActive())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (LocalizedNameResolver.notBlank(value)) return value.trim();
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
