-- Migration: Add application status history tracking
-- Created: 2026-05-24
-- Description: Add status history tracking for applications

-- Create application_status_history table
CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id
    ON application_status_history(application_id);

CREATE INDEX IF NOT EXISTS idx_application_status_history_user_id
    ON application_status_history(user_id);

CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at
    ON application_status_history(changed_at DESC);

-- Add comments for documentation
COMMENT ON TABLE application_status_history IS 'Track status changes for job applications';
COMMENT ON COLUMN application_status_history.application_id IS 'Reference to the application';
COMMENT ON COLUMN application_status_history.user_id IS 'Reference to the user who made the change';
COMMENT ON COLUMN application_status_history.old_status IS 'Previous status before the change';
COMMENT ON COLUMN application_status_history.new_status IS 'New status after the change';
COMMENT ON COLUMN application_status_history.notes IS 'Optional notes about the status change';
COMMENT ON COLUMN application_status_history.changed_at IS 'When the status change occurred';
