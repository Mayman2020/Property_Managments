package com.propertymanagement.modules.finance.pettycash;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "petty_cash_funds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PettyCashFund {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "property_id")
    private Long propertyId;
    @Column(name = "fund_name")
    private String fundName;
    @Column(name = "custodian_id")
    private Long custodianId;
    @Column(name = "opening_balance", precision = 12, scale = 2)
    private BigDecimal openingBalance;
    @Column(name = "current_balance", precision = 12, scale = 2)
    private BigDecimal currentBalance;
    @Column(name = "max_transaction", precision = 10, scale = 2)
    private BigDecimal maxTransaction;
    @Column(name = "is_active")
    private boolean active;
}
