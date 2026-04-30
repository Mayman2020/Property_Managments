package com.propertymanagement.modules.inspection;

import com.propertymanagement.modules.inspection.dto.InspectionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UnitInspectionService {

    private final UnitInspectionRepository inspectionRepository;

    public List<UnitInspection> getByUnit(Long unitId) {
        return inspectionRepository.findByUnitId(unitId);
    }

    public List<UnitInspection> getByContract(Long contractId) {
        return inspectionRepository.findByContractId(contractId);
    }

    @Transactional
    public UnitInspection create(InspectionRequest request) {
        UnitInspection inspection = UnitInspection.builder()
                .unitId(request.getUnitId())
                .contractId(request.getContractId())
                .inspectionType(request.getInspectionType())
                .inspectionDate(request.getInspectionDate())
                .wallsCondition(request.getWallsCondition())
                .floorsCondition(request.getFloorsCondition())
                .doorsCondition(request.getDoorsCondition())
                .windowsCondition(request.getWindowsCondition())
                .plumbingCondition(request.getPlumbingCondition())
                .electricalCondition(request.getElectricalCondition())
                .acCondition(request.getAcCondition())
                .overallCondition(request.getOverallCondition())
                .notes(request.getNotes())
                .damagesDescription(request.getDamagesDescription())
                .deductionsAmount(request.getDeductionsAmount() != null ? request.getDeductionsAmount() : BigDecimal.ZERO)
                .officerId(request.getOfficerId())
                .build();
        return inspectionRepository.save(inspection);
    }
}
