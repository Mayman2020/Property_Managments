package com.propertymanagement.modules.property.attachment;

import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyAttachmentService {

    private final PropertyAttachmentRepository attachmentRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public List<PropertyAttachmentResponse> list(Long propertyId) {
        return attachmentRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public PropertyAttachmentResponse upload(Long propertyId, MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.'));
        }
        String storedName = UUID.randomUUID() + ext;
        Path targetPath = uploadPath.resolve(storedName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String mimeType = file.getContentType();
        if (mimeType == null) {
            try { mimeType = Files.probeContentType(targetPath); } catch (IOException ignored) {}
        }

        PropertyAttachment attachment = PropertyAttachment.builder()
                .propertyId(propertyId)
                .originalName(original != null ? original : storedName)
                .storedName(storedName)
                .filePath(targetPath.toString())
                .fileSize(file.getSize())
                .mimeType(mimeType)
                .uploadedBy(currentUserId())
                .build();

        return toResponse(attachmentRepository.save(attachment));
    }

    public Resource download(Long propertyId, Long attachmentId) {
        PropertyAttachment att = attachmentRepository.findByIdAndPropertyId(attachmentId, propertyId)
                .orElseThrow(() -> AppException.notFound("Attachment not found"));
        try {
            Path filePath = Paths.get(att.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) throw AppException.notFound("File not found on disk");
            return resource;
        } catch (MalformedURLException e) {
            throw AppException.badRequest("Invalid file path");
        }
    }

    public String getMimeType(Long propertyId, Long attachmentId) {
        PropertyAttachment att = attachmentRepository.findByIdAndPropertyId(attachmentId, propertyId)
                .orElseThrow(() -> AppException.notFound("Attachment not found"));
        if (att.getMimeType() != null) return att.getMimeType();
        try {
            return Files.probeContentType(Paths.get(att.getFilePath()));
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    public String getOriginalName(Long propertyId, Long attachmentId) {
        return attachmentRepository.findByIdAndPropertyId(attachmentId, propertyId)
                .map(PropertyAttachment::getOriginalName)
                .orElseThrow(() -> AppException.notFound("Attachment not found"));
    }

    public void delete(Long propertyId, Long attachmentId) {
        PropertyAttachment att = attachmentRepository.findByIdAndPropertyId(attachmentId, propertyId)
                .orElseThrow(() -> AppException.notFound("Attachment not found"));
        try {
            Files.deleteIfExists(Paths.get(att.getFilePath()));
        } catch (IOException e) {
            log.warn("Could not delete file from disk: {}", att.getFilePath(), e);
        }
        attachmentRepository.delete(att);
    }

    private PropertyAttachmentResponse toResponse(PropertyAttachment a) {
        return new PropertyAttachmentResponse(
                a.getId(), a.getPropertyId(), a.getOriginalName(),
                a.getStoredName(), a.getFileSize(), a.getMimeType(),
                a.getUploadedBy(), a.getCreatedAt()
        );
    }

    private Long currentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.propertymanagement.modules.user.User u) {
                return u.getId();
            }
        } catch (Exception ignored) {}
        return null;
    }
}
