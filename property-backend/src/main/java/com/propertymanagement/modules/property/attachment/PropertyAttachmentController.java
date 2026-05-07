package com.propertymanagement.modules.property.attachment;

import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/properties/{propertyId}/attachments")
@RequiredArgsConstructor
public class PropertyAttachmentController {

    private final PropertyAttachmentService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<List<PropertyAttachmentResponse>>> list(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.list(propertyId)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<PropertyAttachmentResponse>> upload(
            @PathVariable Long propertyId,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(ApiResponse.ok(service.upload(propertyId, file)));
    }

    /** View in browser (inline) */
    @GetMapping("/{attachmentId}/view")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<Resource> view(
            @PathVariable Long propertyId,
            @PathVariable Long attachmentId) {
        Resource resource = service.download(propertyId, attachmentId);
        String mimeType = service.getMimeType(propertyId, attachmentId);
        if (mimeType == null) mimeType = "application/octet-stream";
        String originalName = service.getOriginalName(propertyId, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + encode(originalName) + "\"")
                .body(resource);
    }

    /** Force download */
    @GetMapping("/{attachmentId}/download")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<Resource> download(
            @PathVariable Long propertyId,
            @PathVariable Long attachmentId) {
        Resource resource = service.download(propertyId, attachmentId);
        String mimeType = service.getMimeType(propertyId, attachmentId);
        if (mimeType == null) mimeType = "application/octet-stream";
        String originalName = service.getOriginalName(propertyId, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + encode(originalName) + "\"")
                .body(resource);
    }

    @DeleteMapping("/{attachmentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long propertyId,
            @PathVariable Long attachmentId) {
        service.delete(propertyId, attachmentId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private String encode(String name) {
        return URLEncoder.encode(name, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
