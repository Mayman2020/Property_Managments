package com.propertymanagement.modules.tenant.service;

import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.contract.lease.entity.PaymentFrequency;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.dto.CreateContractDto;
import com.propertymanagement.modules.tenant.dto.TenantFullOnboardRequest;
import com.propertymanagement.modules.tenant.dto.TenantOnboardingResponse;
import com.propertymanagement.modules.tenant.dto.TenantRequest;
import com.propertymanagement.modules.tenant.dto.TenantResponse;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.service.UserService;
import com.propertymanagement.modules.user.dto.TenantProfileLinkDto;
import com.propertymanagement.modules.user.dto.UserRequest;
import com.propertymanagement.modules.user.dto.UserResponse;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.user.entity.User;

@Service
@RequiredArgsConstructor
public class TenantOnboardingService {

    private final UserService userService;
    private final TenantService tenantService;
    private final LeaseContractService leaseContractService;


    /**
     * Creates TENANT user (with stub tenant row), fills tenant details, creates DRAFT lease contract,
     * and lease creation syncs unit occupancy — in one transaction so partial failures do not leave orphan users/tenants.
     */
    @Transactional
    public TenantOnboardingResponse onboard(TenantFullOnboardRequest req) {
        String email = req.getEmail().trim();
        String nationalId = req.getNationalId().trim();

        UserRequest userRequest = new UserRequest();
        userRequest.setEmail(email);
        userRequest.setUsername(email);
        // Only set an explicit password when the admin supplies one.
        // Leaving it blank lets UserService.create() apply the configured default and
        // automatically set mustChangePassword = true so the tenant is forced to change it.
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            userRequest.setPassword(req.getPassword());
        }
        userRequest.setFullName(firstNonBlank(req.getFullNameAr(), req.getFullNameEn()));
        userRequest.setPhone(req.getPhone().trim());
        userRequest.setProfileImageUrl(trimToNull(req.getProfileImageUrl()));
        userRequest.setCivilIdImageUrl(trimToNull(req.getCivilIdImageUrl()));
        userRequest.setRole(UserRole.TENANT);
        userRequest.setPropertyId(req.getPropertyId());

        TenantProfileLinkDto link = new TenantProfileLinkDto();
        link.setFullNameAr(trimToNull(req.getFullNameAr()));
        link.setFullNameEn(trimToNull(req.getFullNameEn()));
        link.setNationalId(nationalId);
        link.setLeaseStart(req.getLeaseStart());
        link.setLeaseEnd(req.getLeaseEnd());
        userRequest.setTenantLink(link);

        UserResponse user = userService.create(userRequest);

        TenantRequest tenantRequest = new TenantRequest();
        tenantRequest.setFullName(req.getFullNameAr().trim());
        tenantRequest.setFullNameAr(req.getFullNameAr().trim());
        tenantRequest.setFullNameEn(req.getFullNameEn().trim());
        tenantRequest.setUnitId(req.getUnitId());
        tenantRequest.setPropertyId(req.getPropertyId());
        tenantRequest.setUserId(user.getId());
        tenantRequest.setNationalId(nationalId);
        tenantRequest.setPhone(req.getPhone().trim());
        tenantRequest.setEmail(email);
        tenantRequest.setLeaseStart(req.getLeaseStart());
        tenantRequest.setLeaseEnd(req.getLeaseEnd());
        tenantRequest.setProfileImage(trimToNull(req.getProfileImage() != null ? req.getProfileImage() : req.getProfileImageUrl()));
        tenantRequest.setCivilIdImageUrl(trimToNull(req.getCivilIdImageUrl()));
        tenantRequest.setLeaseContractFiles(req.getLeaseContractFiles());
        tenantRequest.setNotes(trimToNull(req.getNotes()));

        TenantResponse tenant = tenantService.create(tenantRequest);

        CreateContractDto contractDto = new CreateContractDto();
        contractDto.setTenantId(tenant.getId());
        contractDto.setUnitId(req.getUnitId());
        contractDto.setPropertyId(req.getPropertyId());
        contractDto.setStartDate(req.getLeaseStart());
        contractDto.setEndDate(req.getLeaseEnd());
        contractDto.setMonthlyRent(req.getMonthlyRent());
        contractDto.setSecurityDeposit(req.getSecurityDeposit() != null ? req.getSecurityDeposit() : BigDecimal.ZERO);
        contractDto.setPaymentFrequency(req.getPaymentFrequency() != null ? req.getPaymentFrequency() : PaymentFrequency.MONTHLY);
        contractDto.setPaymentDay(req.getPaymentDay() != null ? req.getPaymentDay() : 1);
        contractDto.setHasFreeMonth(Boolean.TRUE.equals(req.getHasFreeMonth()));
        contractDto.setRentDiscountReason(trimToNull(req.getRentDiscountReason()));
        contractDto.setOtherReasonText(trimToNull(req.getOtherReasonText()));
        contractDto.setNotes(trimToNull(req.getNotes()));

        ContractResponse contract = leaseContractService.create(contractDto, currentUserId());

        return TenantOnboardingResponse.builder()
                .userId(user.getId())
                .tenantId(tenant.getId())
                .contractId(contract.getId())
                .contractNumber(contract.getContractNumber())
                .build();
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a.trim();
        }
        if (b != null && !b.isBlank()) {
            return b.trim();
        }
        return "Tenant";
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
