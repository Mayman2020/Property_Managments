package com.propertymanagement.modules.legalentity.controller;

import com.propertymanagement.modules.legalentity.dto.LegalEntityRequest;
import com.propertymanagement.modules.legalentity.dto.LegalEntityResponse;
import com.propertymanagement.modules.legalentity.service.LegalEntityService;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/legal-entities")
@RequiredArgsConstructor
public class LegalEntityController {

    private final LegalEntityService service;

    @GetMapping
    @RequiresPermission(module = "settings", action = "view")
    public ResponseEntity<ApiResponse<List<LegalEntityResponse>>> list(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(activeOnly)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "settings", action = "view")
    public ResponseEntity<ApiResponse<LegalEntityResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping
    @RequiresPermission(module = "settings", action = "create")
    public ResponseEntity<ApiResponse<LegalEntityResponse>> create(@Valid @RequestBody LegalEntityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "settings", action = "edit")
    public ResponseEntity<ApiResponse<LegalEntityResponse>> update(
            @PathVariable Long id, @Valid @RequestBody LegalEntityRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "settings", action = "delete")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
