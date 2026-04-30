package com.propertymanagement.modules.notification;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_code", nullable = false, unique = true, length = 100)
    private String templateCode;

    @Column(name = "title_ar", nullable = false, length = 300)
    private String titleAr;

    @Column(name = "title_en", length = 300)
    private String titleEn;

    @Column(name = "body_ar", nullable = false, columnDefinition = "TEXT")
    private String bodyAr;

    @Column(name = "body_en", columnDefinition = "TEXT")
    private String bodyEn;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private NotificationChannel channel;

    @Column(columnDefinition = "jsonb")
    private String variables;

    @Builder.Default
    @Column(name = "is_active")
    private boolean active = true;
}
