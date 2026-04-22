package com.propertymanagement.modules.maintenance.request.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AttachmentRequest {
    @NotBlank
    private String fileUrl;
    private String fileType;   // IMAGE / VIDEO / DOCUMENT
    private String fileName;
    private Integer fileSizeKb;
}
