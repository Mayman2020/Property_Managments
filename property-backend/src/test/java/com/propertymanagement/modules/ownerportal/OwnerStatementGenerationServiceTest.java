package com.propertymanagement.modules.ownerportal;

import com.propertymanagement.modules.finance.expense.repository.ExpenseWriterRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.owner.repository.OwnerRepository;
import com.propertymanagement.modules.ownerportal.entity.OwnerStatement;
import com.propertymanagement.modules.ownerportal.repository.OwnerRevenueShareRepository;
import com.propertymanagement.modules.ownerportal.repository.OwnerStatementRepository;
import com.propertymanagement.modules.ownerportal.service.OwnerRevenueShareService;
import com.propertymanagement.modules.ownerportal.service.OwnerStatementGenerationService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerStatementGenerationServiceTest {

    @Mock EntityManager entityManager;
    @Mock OwnerStatementRepository ownerStatementRepository;
    @Mock ExpenseWriterRepository expenseWriterRepository;
    @Mock OwnerRevenueShareRepository ownerRevenueShareRepository;
    @Mock OwnerRevenueShareService ownerRevenueShareService;
    @Mock PropertyRepository propertyRepository;
    @Mock OwnerRepository ownerRepository;
    @Mock NotificationService notificationService;

    @InjectMocks OwnerStatementGenerationService service;

    @BeforeEach
    void injectEntityManager() {
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
    }

    @Test
    void generateForMonth_returnsZeroWhenNoPairs() {
        Query ownersQuery = mock(Query.class);
        Query propertiesQuery = mock(Query.class);
        when(entityManager.createNativeQuery(contains("property_owners"))).thenReturn(ownersQuery);
        when(entityManager.createNativeQuery(contains("properties"))).thenReturn(propertiesQuery);
        when(ownersQuery.getResultList()).thenReturn(Collections.emptyList());
        when(propertiesQuery.getResultList()).thenReturn(Collections.emptyList());

        assertThat(service.generateForMonth(2026, 3)).isZero();
        verify(ownerStatementRepository, never()).save(any());
    }

    @Test
    void generateForMonth_upsertsStatement() {
        Query ownersQuery = mock(Query.class);
        Query propertiesQuery = mock(Query.class);
        when(entityManager.createNativeQuery(contains("property_owners"))).thenReturn(ownersQuery);
        when(entityManager.createNativeQuery(contains("properties"))).thenReturn(propertiesQuery);
        when(ownersQuery.getResultList()).thenReturn(Collections.singletonList(new Object[]{1L, 10L}));
        when(propertiesQuery.getResultList()).thenReturn(Collections.emptyList());

        when(ownerRevenueShareRepository.sumAmountByOwnerPropertyMonth(1L, 10L, 2026, 3))
                .thenReturn(new BigDecimal("5000"));
        when(expenseWriterRepository.sumAmountByPropertyBetween(eq(10L), any(), any()))
                .thenReturn(new BigDecimal("1200"));
        when(ownerRevenueShareService.ownershipPercentageFor(10L, 1L))
                .thenReturn(new BigDecimal("100"));
        when(ownerStatementRepository.findByOwnerIdAndPropertyIdAndStatementYearAndStatementMonth(1L, 10L, 2026, 3))
                .thenReturn(Optional.empty());
        when(ownerStatementRepository.save(any(OwnerStatement.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ownerRepository.findById(1L)).thenReturn(Optional.empty());

        assertThat(service.generateForMonth(2026, 3)).isEqualTo(1);
        verify(ownerStatementRepository).save(argThat(s ->
                s.getTotalRevenue().compareTo(new BigDecimal("5000")) == 0
                        && s.getOwnerNetAmount().compareTo(new BigDecimal("3800")) == 0));
    }
}
