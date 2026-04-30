package com.propertymanagement.modules.ownerportal;

import com.propertymanagement.modules.ownerportal.dto.OwnerDashboardResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerPropertyResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerStatementResponse;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/owner-portal")
@RequiredArgsConstructor
public class OwnerPortalController {

    private final OwnerPortalService service;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<OwnerDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboard()));
    }

    @GetMapping("/statements")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<OwnerStatementResponse>>> statements() {
        return ResponseEntity.ok(ApiResponse.ok(service.getStatements()));
    }

    @GetMapping("/properties")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<OwnerPropertyResponse>>> properties() {
        return ResponseEntity.ok(ApiResponse.ok(service.getProperties()));
    }
}
