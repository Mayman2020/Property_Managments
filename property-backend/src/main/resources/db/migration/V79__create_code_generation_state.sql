-- V79: State table used by CodeGenerationService to track per-type per-year sequences

CREATE TABLE IF NOT EXISTS code_generation_state (
    id          BIGSERIAL    PRIMARY KEY,
    code_type   VARCHAR(20)  NOT NULL,
    year        INTEGER      NOT NULL,
    last_number BIGINT       NOT NULL,
    CONSTRAINT uq_cgs_type_year UNIQUE (code_type, year)
);
