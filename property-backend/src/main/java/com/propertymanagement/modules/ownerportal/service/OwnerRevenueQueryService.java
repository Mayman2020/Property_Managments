package com.propertymanagement.modules.ownerportal.service;

import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.ownerportal.dto.OwnerRevenueShareResponse;
import com.propertymanagement.modules.ownerportal.entity.OwnerRevenueShare;
import com.propertymanagement.modules.ownerportal.repository.OwnerRevenueShareRepository;
import com.propertymanagement.modules.property.dto.PropertyRevenueSplitResponse;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerRevenueQueryService {

    private final OwnerRevenueShareRepository shareRepository;
    private final OwnerRepository ownerRepository;
    private final PropertyRepository propertyRepository;
    private final OwnerRevenueShareService ownerRevenueShareService;

    @Transactional(readOnly = true)
    public List<OwnerRevenueShareResponse> listSharesForOwner(Long ownerId, int year, int month) {
        return shareRepository.findByOwnerIdAndYearAndMonthOrderByCreatedAtDesc(ownerId, year, month).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PropertyRevenueSplitResponse propertyRevenueSplit(Long propertyId, int year, int month) {
        Property property = propertyRepository.findById(propertyId).orElse(null);
        String propertyName = property != null ? property.getPropertyName() : null;
        BigDecimal totalRent = shareRepository.sumAmountByPropertyMonth(propertyId, year, month);

        Map<Long, BigDecimal> shareByOwner = shareRepository.findByPropertyIdAndYearAndMonth(propertyId, year, month).stream()
                .collect(Collectors.groupingBy(OwnerRevenueShare::getOwnerId,
                        Collectors.reducing(BigDecimal.ZERO, OwnerRevenueShare::getAmount, BigDecimal::add)));

        List<PropertyRevenueSplitResponse.OwnerSplitRow> rows = new ArrayList<>();
        for (OwnerRevenueShareService.OwnerShare share : ownerRevenueShareService.loadOwnerShares(propertyId)) {
            String ownerName = ownerRepository.findById(share.ownerId()).map(Owner::getFullName).orElse("-");
            rows.add(PropertyRevenueSplitResponse.OwnerSplitRow.builder()
                    .ownerId(share.ownerId())
                    .ownerName(ownerName)
                    .ownershipPercentage(share.percentage())
                    .shareAmount(shareByOwner.getOrDefault(share.ownerId(), BigDecimal.ZERO))
                    .build());
        }

        return PropertyRevenueSplitResponse.builder()
                .propertyId(propertyId)
                .propertyName(propertyName)
                .year(year)
                .month(month)
                .totalRentCollected(totalRent)
                .owners(rows)
                .build();
    }

    private OwnerRevenueShareResponse toResponse(OwnerRevenueShare share) {
        String ownerName = ownerRepository.findById(share.getOwnerId()).map(Owner::getFullName).orElse(null);
        String propertyName = propertyRepository.findById(share.getPropertyId()).map(Property::getPropertyName).orElse(null);
        return OwnerRevenueShareResponse.builder()
                .id(share.getId())
                .ownerId(share.getOwnerId())
                .ownerName(ownerName)
                .propertyId(share.getPropertyId())
                .propertyName(propertyName)
                .rentPaymentId(share.getRentPaymentId())
                .amount(share.getAmount())
                .percentage(share.getPercentage())
                .month(share.getMonth())
                .year(share.getYear())
                .build();
    }
}
