package com.propertymanagement.modules.vacancy.repository;

import com.propertymanagement.modules.vacancy.entity.RentalInquiryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface InquiryRepository extends JpaRepository<RentalInquiryEntity, Long> {

    @Query(value = """
            SELECT ri.id AS id,
                   ri.inquirer_name AS inquirerName,
                   ri.inquirer_phone AS inquirerPhone,
                   ri.inquirer_email AS inquirerEmail,
                   ri.status AS status,
                   ri.preferred_start AS preferredStart
            FROM rental_inquiries ri
            WHERE ri.listing_id = :listingId
            ORDER BY ri.created_at DESC
            """, nativeQuery = true)
    List<RentalInquiryRow> findRowsByListingId(@Param("listingId") Long listingId);

    interface RentalInquiryRow {
        Long getId();
        String getInquirerName();
        String getInquirerPhone();
        String getInquirerEmail();
        String getStatus();
        LocalDate getPreferredStart();
    }
}
