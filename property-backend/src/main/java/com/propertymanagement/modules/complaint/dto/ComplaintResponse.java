package com.propertymanagement.modules.complaint.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplaintResponse {

    private Long id;
    private Long tenantId;
    private String tenantName;
    private String tenantNameAr;
    private String tenantNameEn;
    private Long unitId;
    private String unitNumber;
    private Long propertyId;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private Long contractId;
    private String contractNumber;
    private String contractStatus;
    private String complaintType;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String resolution;
    private String attachmentUrl;
    private Long maintenanceRequestId;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    private List<ReplyDto> replies;
    private RatingDto rating;
    private List<AttachmentDto> attachments;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReplyDto {
        private Long id;
        private Long senderUserId;
        private String senderName;
        private String senderRole;
        private String message;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RatingDto {
        private Long id;
        private String rating;
        private String raterRole;
        private LocalDateTime ratedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AttachmentDto {
        private Long id;
        private String fileUrl;
        private String fileType;
        private String fileName;
        private Integer fileSizeKb;
    }
}
