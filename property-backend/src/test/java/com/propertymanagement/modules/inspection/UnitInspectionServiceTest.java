package com.propertymanagement.modules.inspection;

import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.repository.LeaseContractRepository;
import com.propertymanagement.modules.inspection.dto.LinkDamagesResponse;
import com.propertymanagement.modules.inspection.entity.*;
import com.propertymanagement.modules.inspection.repository.UnitInspectionItemRepository;
import com.propertymanagement.modules.inspection.repository.UnitInspectionRepository;
import com.propertymanagement.modules.inspection.service.UnitInspectionService;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.tenant.repository.TenantRepository;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.modules.vacancy.service.VacancyAlertRecipients;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UnitInspectionServiceTest {

    @Mock UnitInspectionRepository inspectionRepository;
    @Mock UnitInspectionItemRepository itemRepository;
    @Mock LeaseContractRepository contractRepository;
    @Mock TenantRepository tenantRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock VacancyAlertRecipients vacancyAlertRecipients;

    @InjectMocks UnitInspectionService service;

    @Test
    void linkDamages_sumsDamagedItems() {
        UnitInspection inspection = UnitInspection.builder()
                .id(1L).contractId(10L).unitId(5L)
                .inspectionType(InspectionType.MOVE_OUT)
                .status(InspectionStatus.COMPLETED)
                .build();
        LeaseContract contract = LeaseContract.builder()
                .id(10L).securityDeposit(new BigDecimal("500"))
                .build();
        when(inspectionRepository.findById(1L)).thenReturn(Optional.of(inspection));
        when(contractRepository.findById(10L)).thenReturn(Optional.of(contract));
        when(itemRepository.findByInspectionIdOrderByIdAsc(1L)).thenReturn(List.of(
                UnitInspectionItem.builder().condition(ItemCondition.GOOD).estimatedDeduction(BigDecimal.ZERO).build(),
                UnitInspectionItem.builder().condition(ItemCondition.DAMAGED).estimatedDeduction(new BigDecimal("75")).build(),
                UnitInspectionItem.builder().condition(ItemCondition.MISSING).estimatedDeduction(new BigDecimal("25")).build()
        ));
        when(inspectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(contractRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LinkDamagesResponse result = service.linkDamagesToDeposit(1L);

        assertThat(result.getTotalDeduction()).isEqualByComparingTo("100");
        assertThat(result.getRemainingDeposit()).isEqualByComparingTo("400");
        verify(contractRepository).save(argThat(c ->
                Boolean.TRUE.equals(c.getTerminationHasDamages())
                        && c.getTerminationDamagesAmount().compareTo(new BigDecimal("100")) == 0));
    }

    @Test
    void hasSignedMoveOut_trueWhenPresent() {
        when(inspectionRepository.findFirstByContractIdAndInspectionTypeAndStatusOrderByCreatedAtDesc(
                10L, InspectionType.MOVE_OUT, InspectionStatus.SIGNED))
                .thenReturn(Optional.of(UnitInspection.builder().build()));

        assertThat(service.hasSignedMoveOut(10L)).isTrue();
    }
}
