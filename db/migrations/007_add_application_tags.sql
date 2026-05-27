-- Add tags column to applications table
-- Migration: 007_add_application_tags
-- Description: Add tags array field for application categorization and bulk tagging operations

-- Add tags column as an array of strings
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS tags VARCHAR(255)[] DEFAULT '{}';

-- Add index for efficient tag filtering queries
CREATE INDEX IF NOT EXISTS idx_applications_tags
ON applications USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN applications.tags IS 'Array of tags for application categorization and filtering';

-- Record migration
INSERT INTO schema_migrations (version, applied_at)
VALUES ('007_add_application_tags', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;
