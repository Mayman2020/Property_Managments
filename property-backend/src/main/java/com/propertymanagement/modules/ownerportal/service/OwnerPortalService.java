package com.propertymanagement.modules.ownerportal.service;

import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.ownerportal.dto.OwnerDashboardResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerPropertyResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerStatementResponse;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import com.propertymanagement.modules.ownerportal.entity.OwnerStatement;
import com.propertymanagement.modules.ownerportal.repository.OwnerStatementRepository;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class OwnerPortalService {

    private final OwnerRepository ownerRepository;
    private final OwnerStatementRepository ownerStatementRepository;
    private final PropertyRepository propertyRepository;
    private final UnitRepository unitRepository;
    private final OwnerRevenueShareService ownerRevenueShareService;

    public OwnerDashboardResponse getDashboard() {
        Owner owner = currentOwner();
        List<OwnerStatement> statements = ownerStatementRepository.findByOwnerIdOrderByStatementYearDescStatementMonthDesc(owner.getId());
        BigDecimal totalRevenue = statements.stream()
                .map(OwnerStatement::getTotalRevenue)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpenses = statements.stream()
                .map(OwnerStatement::getTotalExpenses)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal ownerNet = statements.stream()
                .map(OwnerStatement::getOwnerNetAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return OwnerDashboardResponse.builder()
                .totalProperties(propertyRepository.countByOwnerIdAndActiveTrue(owner.getId()))
                .totalRevenue(totalRevenue)
                .totalExpenses(totalExpenses)
                .ownerNetAmount(ownerNet)
                .build();
    }

    public List<OwnerStatementResponse> getStatements() {
        Owner owner = currentOwner();
        return ownerStatementRepository.findByOwnerIdOrderByStatementYearDescStatementMonthDesc(owner.getId()).stream()
                .map(item -> OwnerStatementResponse.builder()
                        .id(item.getId())
                        .propertyName(propertyRepository.findById(item.getPropertyId()).map(p -> p.getPropertyName()).orElse(null))
                        .statementMonth(item.getStatementMonth())
                        .statementYear(item.getStatementYear())
                        .totalRevenue(item.getTotalRevenue())
                        .totalExpenses(item.getTotalExpenses())
                        .ownerNetAmount(item.getOwnerNetAmount())
                        .ownershipPercentage(ownerRevenueShareService.ownershipPercentageFor(
                                item.getPropertyId(), owner.getId()))
                        .status(item.getStatus())
                        .pdfUrl(item.getPdfUrl())
                        .build())
                .toList();
    }

    public List<OwnerPropertyResponse> getProperties() {
        Owner owner = currentOwner();
        return propertyRepository.findByOwnerIdAndActiveTrue(owner.getId()).stream()
                .map(property -> OwnerPropertyResponse.builder()
                        .id(property.getId())
                        .propertyName(property.getPropertyName())
                        .propertyCode(property.getPropertyCode())
                        .totalUnits(Math.toIntExact(unitRepository.countByPropertyIdAndActiveTrue(property.getId())))
                        .occupiedUnits(Math.toIntExact(unitRepository.countByPropertyIdAndActiveTrueAndRentedTrue(property.getId())))
                        .build())
                .toList();
    }

    private Owner currentOwner() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return ownerRepository.findByUserId(user.getId())
                    .orElseThrow(() -> AppException.notFound("Owner profile not linked to current user"));
        }
        throw AppException.forbidden("Authenticated owner is required");
    }
}
