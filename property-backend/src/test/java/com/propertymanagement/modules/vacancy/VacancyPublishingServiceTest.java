package com.propertymanagement.modules.vacancy;

import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.repository.UnitRepository;
import com.propertymanagement.modules.vacancy.entity.ListingSource;
import com.propertymanagement.modules.vacancy.entity.VacancyListingEntity;
import com.propertymanagement.modules.vacancy.repository.VacancyRepository;
import com.propertymanagement.modules.vacancy.service.VacancyAlertRecipients;
import com.propertymanagement.modules.vacancy.service.VacancyPublishingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VacancyPublishingServiceTest {

    @Mock VacancyRepository vacancyRepository;
    @Mock LeaseContractRepository contractRepository;
    @Mock UnitRepository unitRepository;
    @Mock PropertyRepository propertyRepository;
    @Mock NotificationService notificationService;
    @Mock VacancyAlertRecipients vacancyAlertRecipients;

    @InjectMocks VacancyPublishingService service;

    @Test
    void autoPublish_skipsWhenPublishedExists() {
        LeaseContract contract = LeaseContract.builder()
                .id(1L).unitId(10L).propertyId(5L)
                .status(ContractStatus.EXPIRED)
                .monthlyRent(new BigDecimal("1200"))
                .build();
        when(vacancyRepository.existsByUnitIdAndPublishedTrue(10L)).thenReturn(true);

        assertThat(service.autoPublishFromContract(contract)).isFalse();
        verify(vacancyRepository, never()).save(any());
    }

    @Test
    void autoPublish_createsListingWithContractRent() {
        LeaseContract contract = LeaseContract.builder()
                .id(2L).unitId(20L).propertyId(6L)
                .status(ContractStatus.TERMINATED)
                .monthlyRent(new BigDecimal("850"))
                .currency("OMR")
                .build();
        when(vacancyRepository.existsByUnitIdAndPublishedTrue(20L)).thenReturn(false);
        when(vacancyRepository.findByUnitId(20L)).thenReturn(Optional.empty());
        when(unitRepository.findById(20L)).thenReturn(Optional.of(
                Unit.builder().id(20L).unitNumber("A-1").build()));
        when(propertyRepository.findById(6L)).thenReturn(Optional.of(
                Property.builder().id(6L).propertyName("Tower").build()));
        when(vacancyAlertRecipients.resolve(6L)).thenReturn(java.util.List.of(99L));
        when(vacancyRepository.save(any())).thenAnswer(inv -> {
            VacancyListingEntity e = inv.getArgument(0);
            e.setId(100L);
            return e;
        });

        assertThat(service.autoPublishFromContract(contract)).isTrue();

        ArgumentCaptor<VacancyListingEntity> cap = ArgumentCaptor.forClass(VacancyListingEntity.class);
        verify(vacancyRepository).save(cap.capture());
        assertThat(cap.getValue().getAskingRent()).isEqualByComparingTo("850");
        assertThat(cap.getValue().isPublished()).isTrue();
        assertThat(cap.getValue().getListingSource()).isEqualTo(ListingSource.AUTO_PUBLISHED);
    }
}
