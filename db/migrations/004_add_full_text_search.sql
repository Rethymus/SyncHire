-- Migration: Add full-text search capabilities
-- Created: 2026-05-26
-- Description: Add PostgreSQL full-text search with tsvector columns and indexes

-- Add full-text search columns to job_descriptions table
ALTER TABLE job_descriptions
ADD COLUMN IF NOT EXISTS search_tsvector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(company_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(job_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(requirements, '')), 'C')
) STORED;

-- Add full-text search columns to resumes table
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS search_tsvector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(parsed_data::text, '')), 'B')
) STORED;

-- Create GiST indexes for full-text search (better for ranking)
CREATE INDEX IF NOT EXISTS idx_job_descriptions_search_gist
    ON job_descriptions USING GIST (search_tsvector);

CREATE INDEX IF NOT EXISTS idx_resumes_search_gist
    ON resumes USING GIST (search_tsvector);

-- Create GIN indexes for full-text search (better for lookup)
CREATE INDEX IF NOT EXISTS idx_job_descriptions_search_gin
    ON job_descriptions USING GIN (search_tsvector);

CREATE INDEX IF NOT EXISTS idx_resumes_search_gin
    ON resumes USING GIN (search_tsvector);

-- Add triggers to update tsvector on data changes (for generated columns that don't auto-update)
CREATE OR REPLACE FUNCTION job_descriptions_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_tsvector :=
        setweight(to_tsvector('english', coalesce(NEW.company_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.job_title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.requirements, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resumes_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_tsvector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.parsed_data::text, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS job_descriptions_search_update_trigger ON job_descriptions;
CREATE TRIGGER job_descriptions_search_update_trigger
    BEFORE INSERT OR UPDATE ON job_descriptions
    FOR EACH ROW EXECUTE FUNCTION job_descriptions_search_update();

DROP TRIGGER IF EXISTS resumes_search_update_trigger ON resumes;
CREATE TRIGGER resumes_search_update_trigger
    BEFORE INSERT OR UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION resumes_search_update();

-- Add comments for documentation
COMMENT ON COLUMN job_descriptions.search_tsvector IS 'Full-text search vector for job descriptions';
COMMENT ON COLUMN resumes.search_tsvector IS 'Full-text search vector for resumes';
COMMENT ON INDEX idx_job_descriptions_search_gist IS 'GiST index for full-text search with ranking support';
COMMENT ON INDEX idx_resumes_search_gist IS 'GiST index for full-text search with ranking support';
COMMENT ON INDEX idx_job_descriptions_search_gin IS 'GIN index for fast full-text search lookups';
COMMENT ON INDEX idx_resumes_search_gin IS 'GIN index for fast full-text search lookups';
