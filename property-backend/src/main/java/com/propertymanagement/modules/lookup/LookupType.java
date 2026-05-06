package com.propertymanagement.modules.lookup;

public enum LookupType {
    COUNTRY,
    CITY,
    UNIT_TYPE,
    PROPERTY_TYPE,
    PROPERTY_STATUS,
    FLOOR_TYPE,
    PAYMENT_METHOD,
    PAYMENT_FREQUENCY,
    CONTRACT_TYPE,
    CONTRACT_STATUS,
    TERMINATION_REASON,
    JOB_TITLE,
    UNIT_OF_MEASURE,
    COMPLAINT_STATUS,
    COMPLAINT_PRIORITY,
    COMPLAINT_TYPE,
    FURNISHED_STATUS,
    /** ISO-like currency codes for contracts and finance. */
    CURRENCY,
    MONTH,
    YEAR,
    /** Why rent is below list price (stored on lease / tenant flows). */
    RENT_DISCOUNT_REASON,
    /** Staff reason when editing a draft contract before activation. */
    CONTRACT_DRAFT_AMEND_REASON
}
