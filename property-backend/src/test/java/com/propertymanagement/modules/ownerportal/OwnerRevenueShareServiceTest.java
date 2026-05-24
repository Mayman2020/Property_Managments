package com.propertymanagement.modules.ownerportal;

import com.propertymanagement.modules.contract.payment.entity.RentPayment;
import com.propertymanagement.modules.ownerportal.entity.OwnerRevenueShare;
import com.propertymanagement.modules.ownerportal.repository.OwnerRevenueShareRepository;
import com.propertymanagement.modules.ownerportal.service.OwnerRevenueShareService;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerRevenueShareServiceTest {

    @Mock EntityManager entityManager;
    @Mock Query nativeQuery;
    @Mock OwnerRevenueShareRepository shareRepository;
    @Mock PropertyRepository propertyRepository;

    @InjectMocks OwnerRevenueShareService service;

    @BeforeEach
    void injectEm() {
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
    }

    @Test
    void allocateShares_splits60And40() {
        when(shareRepository.existsByRentPaymentId(10L)).thenReturn(false);
        when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        when(nativeQuery.setParameter(anyString(), any())).thenReturn(nativeQuery);
        when(nativeQuery.getResultList()).thenReturn(
                List.of(new Object[]{1L, new BigDecimal("60")}, new Object[]{2L, new BigDecimal("40")}));
        when(propertyRepository.findById(5L)).thenReturn(Optional.empty());
        when(shareRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RentPayment payment = RentPayment.builder()
                .id(10L)
                .amountPaid(new BigDecimal("1000"))
                .paymentDate(LocalDate.of(2026, 3, 15))
                .build();

        service.allocateShares(payment, 5L);

        ArgumentCaptor<OwnerRevenueShare> captor = ArgumentCaptor.forClass(OwnerRevenueShare.class);
        verify(shareRepository, times(2)).save(captor.capture());
        List<OwnerRevenueShare> saved = captor.getAllValues();
        assertThat(saved.get(0).getAmount()).isEqualByComparingTo("600");
        assertThat(saved.get(1).getAmount()).isEqualByComparingTo("400");
    }
}
