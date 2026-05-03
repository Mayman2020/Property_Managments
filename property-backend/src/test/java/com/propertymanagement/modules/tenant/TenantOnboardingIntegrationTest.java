package com.propertymanagement.modules.tenant;

import com.propertymanagement.modules.contract.lease.ContractStatus;
import com.propertymanagement.modules.contract.lease.LeaseContractRepository;
import com.propertymanagement.modules.owner.Owner;
import com.propertymanagement.modules.owner.OwnerRepository;
import com.propertymanagement.modules.property.Property;
import com.propertymanagement.modules.property.PropertyRepository;
import com.propertymanagement.modules.property.PropertyType;
import com.propertymanagement.modules.tenant.dto.TenantFullOnboardRequest;
import com.propertymanagement.modules.tenant.dto.TenantOnboardingResponse;
import com.propertymanagement.modules.unit.Unit;
import com.propertymanagement.modules.unit.UnitRepository;
import com.propertymanagement.modules.unit.UnitType;
import com.propertymanagement.modules.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Docker-based integration test (PostgreSQL via Testcontainers).
 * Default {@code mvn test} skips this class; with Docker: {@code mvn test -Pintegration}.
 * {@code disabledWithoutDocker} avoids hard failure if Docker is unavailable when the class is run.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
class TenantOnboardingIntegrationTest {

    @Container
    static PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        String jdbc = POSTGRES.getJdbcUrl();
        String url = jdbc.contains("?") ? jdbc + "&currentSchema=property_mgmt" : jdbc + "?currentSchema=property_mgmt";
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private TenantOnboardingService tenantOnboardingService;
    @Autowired
    private OwnerRepository ownerRepository;
    @Autowired
    private PropertyRepository propertyRepository;
    @Autowired
    private UnitRepository unitRepository;
    @Autowired
    private TenantRepository tenantRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LeaseContractRepository leaseContractRepository;

    private Long propertyId;
    private Long unitId;
    private String suffix;

    @BeforeEach
    void seedPropertyAndVacantUnit() {
        suffix = UUID.randomUUID().toString().substring(0, 8);
        Owner owner = ownerRepository.save(Owner.builder()
                .fullName("IT Owner " + suffix)
                .fullNameAr("مالك " + suffix)
                .fullNameEn("Owner " + suffix)
                .nationalId("NID-IT-" + suffix)
                .phone("90000000")
                .email("owner-it-" + suffix + "@test.local")
                .active(true)
                .build());

        Property property = propertyRepository.save(Property.builder()
                .ownerId(owner.getId())
                .propertyName("IT Prop " + suffix)
                .propertyNameAr("عقار " + suffix)
                .propertyNameEn("Prop " + suffix)
                .propertyCode("PROP-IT-" + suffix)
                .propertyType(PropertyType.RESIDENTIAL)
                .address("Test address")
                .active(true)
                .build());

        Unit unit = unitRepository.save(Unit.builder()
                .propertyId(property.getId())
                .unitNumber("U-IT-" + suffix)
                .unitType(UnitType.APARTMENT)
                .areaSqm(BigDecimal.valueOf(80))
                .rentAmount(BigDecimal.valueOf(400))
                .rented(false)
                .active(true)
                .build());

        propertyId = property.getId();
        unitId = unit.getId();
    }

    @Test
    @Transactional
    void onboard_persistsTenantContractAndMarksUnitRented() {
        String email = "tenant-it-" + suffix + "@test.local";
        LocalDate start = LocalDate.now().minusDays(1);
        LocalDate end = LocalDate.now().plusYears(1);

        TenantFullOnboardRequest req = new TenantFullOnboardRequest();
        req.setEmail(email);
        req.setPassword("nat-" + suffix);
        req.setFullNameAr("مستأجر " + suffix);
        req.setFullNameEn("Tenant " + suffix);
        req.setPhone("91111111");
        req.setNationalId("CIV-" + suffix);
        req.setLeaseStart(start);
        req.setLeaseEnd(end);
        req.setPropertyId(propertyId);
        req.setUnitId(unitId);
        req.setProfileImageUrl("https://example.com/profile-" + suffix + ".jpg");
        req.setProfileImage("https://example.com/profile-" + suffix + ".jpg");
        req.setLeaseContractFiles(List.of("https://example.com/lease-" + suffix + ".pdf"));
        req.setNotes("onboard IT");
        req.setMonthlyRent(BigDecimal.valueOf(350));
        req.setSecurityDeposit(BigDecimal.valueOf(500));

        TenantOnboardingResponse result = tenantOnboardingService.onboard(req);

        assertThat(result.getUserId()).isNotNull();
        assertThat(result.getTenantId()).isNotNull();
        assertThat(result.getContractId()).isNotNull();
        assertThat(result.getContractNumber()).isNotBlank();

        assertThat(userRepository.findByEmail(email)).isPresent();

        Tenant tenant = tenantRepository.findById(result.getTenantId()).orElseThrow();
        assertThat(tenant.isActive()).isTrue();
        assertThat(tenant.getEmail()).isEqualTo(email);
        assertThat(tenant.getNationalId()).isEqualTo("CIV-" + suffix);
        assertThat(tenant.getUnitId()).isEqualTo(unitId);
        assertThat(tenant.getPropertyId()).isEqualTo(propertyId);
        assertThat(tenant.getLeaseContractFiles()).isNotEmpty();

        assertThat(leaseContractRepository.findByTenantId(result.getTenantId()))
                .hasSize(1);
        assertThat(leaseContractRepository.findByTenantId(result.getTenantId()).get(0).getStatus())
                .isEqualTo(ContractStatus.DRAFT);
        assertThat(leaseContractRepository.findByTenantId(result.getTenantId()).get(0).getUnitId())
                .isEqualTo(unitId);

        assertThat(unitRepository.findById(unitId).orElseThrow().isRented()).isTrue();
    }
}
