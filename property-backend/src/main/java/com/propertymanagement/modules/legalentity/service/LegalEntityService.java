package com.propertymanagement.modules.legalentity.service;

import com.propertymanagement.modules.legalentity.dto.LegalEntityRequest;
import com.propertymanagement.modules.legalentity.dto.LegalEntityResponse;
import com.propertymanagement.modules.legalentity.entity.LegalEntity;
import com.propertymanagement.modules.legalentity.repository.LegalEntityRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LegalEntityService {

    private final LegalEntityRepository repository;

    public List<LegalEntityResponse> getAll(boolean activeOnly) {
        List<LegalEntity> list = activeOnly
                ? repository.findByActiveTrueOrderByNameArAsc()
                : repository.findAllByOrderByNameArAsc();
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public LegalEntityResponse getById(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public LegalEntityResponse create(LegalEntityRequest request) {
        LegalEntity entity = LegalEntity.builder()
                .nameAr(request.getNameAr())
                .nameEn(request.getNameEn())
                .commercialRegistration(request.getCommercialRegistration())
                .taxNumber(request.getTaxNumber())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .active(Boolean.TRUE.equals(request.getActive()) || request.getActive() == null)
                .build();
        return toResponse(repository.save(entity));
    }

    @Transactional
    public LegalEntityResponse update(Long id, LegalEntityRequest request) {
        LegalEntity entity = find(id);
        entity.setNameAr(request.getNameAr());
        entity.setNameEn(request.getNameEn());
        entity.setCommercialRegistration(request.getCommercialRegistration());
        entity.setTaxNumber(request.getTaxNumber());
        entity.setAddress(request.getAddress());
        entity.setPhone(request.getPhone());
        entity.setEmail(request.getEmail());
        if (request.getActive() != null) entity.setActive(request.getActive());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        find(id);
        repository.deleteById(id);
    }

    private LegalEntity find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> AppException.notFound("Legal entity not found: " + id));
    }

    private LegalEntityResponse toResponse(LegalEntity e) {
        return LegalEntityResponse.builder()
                .id(e.getId())
                .nameAr(e.getNameAr())
                .nameEn(e.getNameEn())
                .commercialRegistration(e.getCommercialRegistration())
                .taxNumber(e.getTaxNumber())
                .address(e.getAddress())
                .phone(e.getPhone())
                .email(e.getEmail())
                .active(e.isActive())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
