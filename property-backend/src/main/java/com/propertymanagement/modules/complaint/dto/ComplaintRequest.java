package com.propertymanagement.modules.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class ComplaintRequest {
    private Long tenantId;
    private Long unitId;
    private Long propertyId;
    private String complaintType;
    @NotBlank private String title;
    @NotBlank private String description;
    private String priority;
    private String attachmentUrl;
    private List<AttachmentItem> attachments;

    @Data
    public static class AttachmentItem {
        private String fileUrl;
        private String fileType;
        private String fileName;
        private Integer fileSizeKb;
    }
}
