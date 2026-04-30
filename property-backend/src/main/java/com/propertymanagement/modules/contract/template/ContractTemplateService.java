package com.propertymanagement.modules.contract.template;

import com.propertymanagement.modules.contract.template.dto.ContractTemplateRequest;
import com.propertymanagement.modules.contract.template.dto.ContractTemplateResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
        ContractTemplate template = ContractTemplate.builder()
                .templateName(request.getTemplateName())
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
        template.setTemplateName(request.getTemplateName());
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
                .templateType(t.getTemplateType())
                .content(t.getContent())
                .variables(t.getVariables())
                .isActive(t.isActive())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}
