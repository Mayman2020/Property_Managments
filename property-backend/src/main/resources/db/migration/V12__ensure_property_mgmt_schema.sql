-- V12: Align schema strategy with hesabaty/srs style
-- Keep Flyway history in public while app tables live in property_mgmt.

CREATE SCHEMA IF NOT EXISTS property_mgmt;
