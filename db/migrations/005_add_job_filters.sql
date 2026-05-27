-- Migration: Add job filtering fields
-- Created: 2026-05-26
-- Description: Add fields for advanced job filtering (salary, location, experience, etc.)

-- Add advanced filtering columns to job_descriptions
ALTER TABLE job_descriptions
ADD COLUMN IF NOT EXISTS salary_min DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS salary_max DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS salary_period VARCHAR(20) DEFAULT 'yearly', -- hourly, monthly, yearly
ADD COLUMN IF NOT EXISTS location_city VARCHAR(255),
ADD COLUMN IF NOT EXISTS location_state VARCHAR(255),
ADD COLUMN IF NOT EXISTS location_country VARCHAR(255) DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS location_remote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_hybrid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_onsite BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS experience_level VARCHAR(20), -- entry, mid, senior, lead, executive
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'full-time', -- full-time, part-time, contract, internship
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_size VARCHAR(50), -- 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+
ADD COLUMN IF NOT EXISTS company_industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS posted_date DATE,
ADD COLUMN IF NOT EXISTS application_deadline DATE;

-- Create indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_job_descriptions_salary
    ON job_descriptions(salary_min, salary_max) WHERE salary_min IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_location
    ON job_descriptions(location_country, location_state, location_city);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_remote
    ON job_descriptions(location_remote, location_hybrid, location_onsite);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_experience
    ON job_descriptions(experience_level) WHERE experience_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_employment_type
    ON job_descriptions(employment_type);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_industry
    ON job_descriptions(industry) WHERE industry IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_company_size
    ON job_descriptions(company_size) WHERE company_size IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_descriptions_posted_date
    ON job_descriptions(posted_date DESC);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_application_deadline
    ON job_descriptions(application_deadline);

-- Add composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_job_descriptions_filters_composite
    ON job_descriptions(experience_level, employment_type, location_remote)
    WHERE experience_level IS NOT NULL;

-- Add check constraints for data integrity
ALTER TABLE job_descriptions
ADD CONSTRAINT IF NOT EXISTS chk_salary_min_positive
    CHECK (salary_min IS NULL OR salary_min >= 0);

ALTER TABLE job_descriptions
ADD CONSTRAINT IF NOT EXISTS chk_salary_max_range
    CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min);

ALTER TABLE job_descriptions
ADD CONSTRAINT IF NOT EXISTS chk_salary_currency
    CHECK (salary_currency IS NULL OR salary_currency ~ '^[A-Z]{3}$');

ALTER TABLE job_descriptions
ADD CONSTRAINT IF NOT EXISTS chk_experience_level
    CHECK (experience_level IS NULL OR experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive'));

ALTER TABLE job_descriptions
ADD CONSTRAINT IF NOT EXISTS chk_employment_type
    CHECK (employment_type IS NULL OR employment_type IN ('full-time', 'part-time', 'contract', 'internship'));

ALTER TABLE job_descriptions
ADD CONSTRAINT IF NOT EXISTS chk_salary_period
    CHECK (salary_period IS NULL OR salary_period IN ('hourly', 'monthly', 'yearly'));

-- Add comments for documentation
COMMENT ON COLUMN job_descriptions.salary_min IS 'Minimum salary for the position';
COMMENT ON COLUMN job_descriptions.salary_max IS 'Maximum salary for the position';
COMMENT ON COLUMN job_descriptions.salary_currency IS 'Currency code (ISO 4217)';
COMMENT ON COLUMN job_descriptions.salary_period IS 'Salary period: hourly, monthly, or yearly';
COMMENT ON COLUMN job_descriptions.location_city IS 'City where the position is located';
COMMENT ON COLUMN job_descriptions.location_state IS 'State/region where the position is located';
COMMENT ON COLUMN job_descriptions.location_country IS 'Country where the position is located';
COMMENT ON COLUMN job_descriptions.location_remote IS 'True if position is fully remote';
COMMENT ON COLUMN job_descriptions.location_hybrid IS 'True if position is hybrid';
COMMENT ON COLUMN job_descriptions.location_onsite IS 'True if position requires onsite work';
COMMENT ON COLUMN job_descriptions.experience_level IS 'Required experience level: entry, mid, senior, lead, executive';
COMMENT ON COLUMN job_descriptions.employment_type IS 'Type of employment: full-time, part-time, contract, internship';
COMMENT ON COLUMN job_descriptions.industry IS 'Industry sector for the position';
COMMENT ON COLUMN job_descriptions.company_size IS 'Company size range';
COMMENT ON COLUMN job_descriptions.company_industry IS 'Industry of the company';
COMMENT ON COLUMN job_descriptions.posted_date IS 'When the job was posted';
COMMENT ON COLUMN job_descriptions.application_deadline IS 'Application deadline for the position';
