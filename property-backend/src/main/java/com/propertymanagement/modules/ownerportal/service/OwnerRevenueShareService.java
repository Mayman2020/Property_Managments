package com.propertymanagement.modules.ownerportal.service;

import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.ownerportal.entity.OwnerRevenueShare;
import com.propertymanagement.modules.ownerportal.repository.OwnerRevenueShareRepository;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.shared.exception.AppException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OwnerRevenueShareService {

    @PersistenceContext
    private EntityManager entityManager;

    private final OwnerRevenueShareRepository shareRepository;
    private final PropertyRepository propertyRepository;

    // PHASE2-DONE: TASK1 — OwnerRevenueShare on rent confirmation
    @Transactional
    public void allocateShares(RentPayment payment, Long propertyId) {
        if (payment == null || payment.getId() == null || propertyId == null) {
            return;
        }
        if (shareRepository.existsByRentPaymentId(payment.getId())) {
            return;
        }
        BigDecimal totalPaid = payment.getAmountPaid() != null ? payment.getAmountPaid() : BigDecimal.ZERO;
        if (totalPaid.signum() <= 0) {
            return;
        }

        List<OwnerShare> shares = loadOwnerShares(propertyId);
        if (shares.isEmpty()) {
            return;
        }
        validatePercentagesSum(shares, propertyId);

        LocalDate paymentDate = payment.getPaymentDate() != null ? payment.getPaymentDate() : LocalDate.now();
        int year = paymentDate.getYear();
        int month = paymentDate.getMonthValue();

        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < shares.size(); i++) {
            OwnerShare share = shares.get(i);
            BigDecimal amount;
            if (i == shares.size() - 1) {
                amount = totalPaid.subtract(allocated);
            } else {
                amount = totalPaid.multiply(share.percentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                allocated = allocated.add(amount);
            }
            shareRepository.save(OwnerRevenueShare.builder()
                    .ownerId(share.ownerId())
                    .propertyId(propertyId)
                    .rentPaymentId(payment.getId())
                    .amount(amount)
                    .percentage(share.percentage())
                    .month(month)
                    .year(year)
                    .build());
        }
    }

    public List<OwnerShare> loadOwnerShares(Long propertyId) {
        Map<Long, BigDecimal> byOwner = new LinkedHashMap<>();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT owner_id, ownership_percentage
                FROM property_mgmt.property_owners
                WHERE property_id = :pid
                ORDER BY owner_id
                """)
                .setParameter("pid", propertyId)
                .getResultList();
        for (Object[] row : rows) {
            byOwner.put(((Number) row[0]).longValue(), (BigDecimal) row[1]);
        }
        propertyRepository.findById(propertyId)
                .map(Property::getOwnerId)
                .filter(oid -> oid != null && !byOwner.containsKey(oid))
                .ifPresent(oid -> byOwner.put(oid, BigDecimal.valueOf(100)));

        List<OwnerShare> result = new ArrayList<>();
        byOwner.forEach((ownerId, pct) -> result.add(new OwnerShare(ownerId, pct)));
        return result;
    }

    public BigDecimal ownershipPercentageFor(Long propertyId, Long ownerId) {
        return loadOwnerShares(propertyId).stream()
                .filter(s -> s.ownerId().equals(ownerId))
                .map(OwnerShare::percentage)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    private void validatePercentagesSum(List<OwnerShare> shares, Long propertyId) {
        BigDecimal sum = shares.stream()
                .map(OwnerShare::percentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(BigDecimal.valueOf(100)) != 0) {
            throw AppException.badRequest(
                    "Property " + propertyId + " owner percentages must sum to 100 (current: " + sum + ")",
                    "OWNER_PERCENTAGE_INVALID");
        }
    }

    public record OwnerShare(Long ownerId, BigDecimal percentage) {}
}
