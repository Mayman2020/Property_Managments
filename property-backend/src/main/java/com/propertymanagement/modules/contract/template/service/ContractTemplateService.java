package com.propertymanagement.modules.contract.template.service;

import com.propertymanagement.modules.contract.template.dto.ContractTemplateRequest;
import com.propertymanagement.modules.contract.template.dto.ContractTemplateResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import com.propertymanagement.modules.contract.template.entity.ContractTemplate;
import com.propertymanagement.modules.contract.template.repository.ContractTemplateRepository;

@Service
@RequiredArgsConstructor
public class ContractTemplateService {

    private final ContractTemplateRepository templateRepository;

    public Page<ContractTemplateResponse> getAll(Pageable pageable) {
        return templateRepository.findAll(pageable).map(this::toResponse);
    }

    public List<ContractTemplateResponse> getActive() {
        return templateRepository.findByIsActiveTrue().stream().map(this::toResponse).toList();
    }

    public ContractTemplateResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public ContractTemplateResponse create(ContractTemplateRequest request) {
        String nameAr = firstNonBlank(request.getTemplateNameAr(), request.getTemplateName());
        String nameEn = firstNonBlank(request.getTemplateNameEn(), request.getTemplateName());
        String legacyName = firstNonBlank(request.getTemplateName(), nameAr, nameEn);
        if (legacyName == null) {
            throw AppException.badRequest("Template name is required");
        }
        ContractTemplate template = ContractTemplate.builder()
                .templateName(legacyName)
                .templateNameAr(nameAr != null ? nameAr : legacyName)
                .templateNameEn(nameEn != null ? nameEn : legacyName)
                .templateType(request.getTemplateType())
                .content(request.getContent())
                .variables(request.getVariables())
                .isActive(Boolean.TRUE.equals(request.getIsActive()))
                .build();
        return toResponse(templateRepository.save(template));
    }

    @Transactional
    public ContractTemplateResponse update(Long id, ContractTemplateRequest request) {
        ContractTemplate template = findById(id);
        String nameAr = firstNonBlank(request.getTemplateNameAr(), request.getTemplateName());
        String nameEn = firstNonBlank(request.getTemplateNameEn(), request.getTemplateName());
        String legacyName = firstNonBlank(request.getTemplateName(), nameAr, nameEn);
        if (legacyName == null) {
            throw AppException.badRequest("Template name is required");
        }
        template.setTemplateName(legacyName);
        template.setTemplateNameAr(nameAr != null ? nameAr : legacyName);
        template.setTemplateNameEn(nameEn != null ? nameEn : legacyName);
        template.setTemplateType(request.getTemplateType());
        template.setContent(request.getContent());
        template.setVariables(request.getVariables());
        if (request.getIsActive() != null) {
            template.setActive(request.getIsActive());
        }
        return toResponse(templateRepository.save(template));
    }

    private ContractTemplate findById(Long id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Contract template not found: " + id));
    }

    private ContractTemplateResponse toResponse(ContractTemplate t) {
        return ContractTemplateResponse.builder()
                .id(t.getId())
                .templateName(t.getTemplateName())
                .templateNameAr(t.getTemplateNameAr())
                .templateNameEn(t.getTemplateNameEn())
                .templateType(t.getTemplateType())
                .content(t.getContent())
                .variables(t.getVariables())
                .isActive(t.isActive())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String trimmed = trimToNull(value);
            if (trimmed != null) {
                return trimmed;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
