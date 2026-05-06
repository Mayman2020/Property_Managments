package com.propertymanagement.modules.files;

import com.propertymanagement.shared.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/files")
public class FileUploadController {

    /** Stored object names are UUID + extension; reject anything else on read/write. */
    private static final Pattern STORED_NAME_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.[A-Za-z0-9]{1,10}$");

    /** Includes Windows/phone variants (e.g. {@code .jfif}, {@code .heic}) so small JPEGs are not rejected by extension alone. */
    private static final Set<String> UPLOAD_ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".jpe", ".jfif", ".pjpeg",
            ".png", ".gif", ".webp", ".avif",
            ".bmp", ".tif", ".tiff",
            ".heic", ".heif",
            ".pdf", ".doc", ".docx");

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".jpe", ".jfif", ".pjpeg",
            ".png", ".gif", ".webp", ".avif",
            ".bmp", ".tif", ".tiff",
            ".heic", ".heif");
    private static final long MAX_IMAGE_UPLOAD_BYTES = 20L * 1024 * 1024;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.base-url}")
    private String baseUrl;

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> upload(
            @RequestParam("file") MultipartFile file) throws IOException {

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }
        if (ext.isEmpty() || !UPLOAD_ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Only common image and document extensions are allowed.", "UNSUPPORTED_FILE_TYPE"));
        }
        if (IMAGE_EXTENSIONS.contains(ext) && file.getSize() > MAX_IMAGE_UPLOAD_BYTES) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Image exceeds maximum size (20 MB).", "FILE_TOO_LARGE"));
        }
        String filename = UUID.randomUUID() + ext;
        if (!STORED_NAME_PATTERN.matcher(filename).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid generated filename.", "INVALID_FILENAME"));
        }
        Path targetPath = uploadPath.resolve(filename).normalize();
        if (!targetPath.startsWith(uploadPath)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid path.", "INVALID_PATH"));
        }
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String url = baseUrl + "/api/v1/files/" + filename;
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url, "filename", filename)));
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            if (filename == null || filename.isBlank()) {
                return ResponseEntity.notFound().build();
            }
            // Block path traversal; allow legacy paths like "demo/…" under upload-dir only.
            String normalizedName = filename.replace('\\', '/').replaceAll("^/+", "");
            if (normalizedName.contains("..")) {
                return ResponseEntity.notFound().build();
            }
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(normalizedName).normalize();
            if (!filePath.startsWith(uploadPath)) {
                log.warn("Rejected file path outside upload dir: {}", filename);
                return ResponseEntity.badRequest().build();
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = "application/octet-stream";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("Error serving file: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
