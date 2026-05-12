package com.propertymanagement.modules.notification.controller;

import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.notification.dto.NotificationResponseDTO;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<NotificationResponseDTO>>> getMy(
            @RequestParam(defaultValue = "recent") String scope,
            @PageableDefault(size = 5) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getMyNotifications(pageable, scope)));
    }

    @GetMapping("/my/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "unreadCount", notificationService.getMyUnreadCount()
        )));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponseDTO>> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(notificationService.markRead(id)));
    }

    @PatchMapping("/my/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
