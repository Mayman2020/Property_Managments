package com.propertymanagement.modules.property;

import com.propertymanagement.shared.persistence.StringListJsonConverter;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "properties")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "property_name", nullable = false, length = 200)
    private String propertyName;

    @Column(name = "property_name_ar", length = 200)
    private String propertyNameAr;

    @Column(name = "property_name_en", length = 200)
    private String propertyNameEn;

    @Column(name = "property_code", unique = true, nullable = false, length = 50)
    private String propertyCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false, length = 30)
    private PropertyType propertyType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String country;

    @Column(name = "google_map_url", length = 1000)
    private String googleMapUrl;

    @Builder.Default
    @Column(name = "total_floors")
    private Integer totalFloors = 1;

    @Builder.Default
    @Column(name = "total_units")
    private Integer totalUnits = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Builder.Default
    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "owner_document_files", columnDefinition = "TEXT")
    private List<String> ownerDocumentFiles = new ArrayList<>();

    @Builder.Default
    @Column(name = "is_active")
    private boolean active = true;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @CreatedDate
    @Column(name = "created_on", updatable = false)
    private LocalDateTime createdOn;

    @LastModifiedBy
    @Column(name = "modified_by")
    private Long modifiedBy;

    @LastModifiedDate
    @Column(name = "modified_on")
    private LocalDateTime modifiedOn;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
