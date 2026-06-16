package com.propertymanagement.modules.files.controller;

import com.propertymanagement.modules.files.FileAccessTokenService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
@RequiredArgsConstructor
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

    private final FileAccessTokenService fileAccessTokenService;

    // ── Upload ──────────────────────────────────────────────────────────────

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

        String url = buildPublicFileUrl(filename);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url, "filename", filename)));
    }

    // ── Short-lived signed file access token ────────────────────────────────

    /**
     * Issues a short-lived (5-minute) signed token that allows downloading
     * {@code filename} without sending the main JWT in the URL.
     *
     * Usage:
     *   POST /files/sign?filename=abc.jpg   (Authorization: Bearer <JWT>)
     *   → { "token": "...", "url": ".../files/abc.jpg?st=...", "expiresInSeconds": 300 }
     *
     * The frontend uses this token in image src instead of ?tk=<main JWT>.
     */
    @PostMapping("/sign")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> signFileUrl(
            @RequestParam("filename") String filename) {

        if (filename == null || filename.isBlank() || !STORED_NAME_PATTERN.matcher(filename).matches()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid filename", "INVALID_FILENAME"));
        }
        Long userId = currentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required", "UNAUTHENTICATED"));
        }
        String token = fileAccessTokenService.issue(userId, filename);
        String signedUrl = buildPublicFileUrl(filename) + "?st=" + token;
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "token", token,
                "url", signedUrl,
                "expiresInSeconds", fileAccessTokenService.getTtlSeconds()
        )));
    }

    // ── Serve file ───────────────────────────────────────────────────────────

    /**
     * Serves a stored file.
     *
     * Authentication is accepted in two ways:
     * <ol>
     *   <li>Standard Bearer JWT via {@code Authorization} header (JwtAuthFilter sets the
     *       SecurityContext before this method is called).</li>
     *   <li>Short-lived signed token via {@code ?st=} query parameter, issued by
     *       {@link #signFileUrl} specifically for browser image-tag embeds.</li>
     * </ol>
     *
     * The legacy {@code ?tk=} JWT query parameter is no longer accepted.
     */
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable String filename,
            @RequestParam(name = "st", required = false) String signedToken) {
        try {
            if (filename == null || filename.isBlank()) {
                return ResponseEntity.notFound().build();
            }

            // Determine if caller is authenticated:
            //  (a) via standard Bearer JWT (SecurityContext already populated by JwtAuthFilter), OR
            //  (b) via a short-lived signed token in the ?st= query parameter.
            boolean authenticated = isSecurityContextAuthenticated();
            if (!authenticated && signedToken != null && !signedToken.isBlank()) {
                // Validate the signed token for this specific file
                Long userId = fileAccessTokenService.validateAndConsume(signedToken, filename);
                authenticated = (userId != null);
            }
            if (!authenticated) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

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

    // ── Helpers ──────────────────────────────────────────────────────────────

    private boolean isSecurityContextAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !(auth.getPrincipal() instanceof String s && "anonymousUser".equals(s));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }

    private String buildPublicFileUrl(String filename) {
        String cleanBaseUrl = (baseUrl == null ? "" : baseUrl.trim()).replaceAll("/+$", "");
        if (cleanBaseUrl.endsWith("/api/v1/files")) {
            return cleanBaseUrl + "/" + filename;
        }
        if (cleanBaseUrl.endsWith("/api/v1")) {
            return cleanBaseUrl + "/files/" + filename;
        }
        return cleanBaseUrl + "/api/v1/files/" + filename;
    }
}
