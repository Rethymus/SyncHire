-- Migration: Add interview scheduling functionality
-- Created: 2026-05-26
-- Description: Add interview scheduling with calendar integration and reminders

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Interview details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    interview_type VARCHAR(50) NOT NULL DEFAULT 'screening', -- screening, technical, behavioral, panel, onsite, final
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, rescheduled

    -- Scheduling
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- Location/Platform
    location_type VARCHAR(50) NOT NULL DEFAULT 'remote', -- remote, in_person, phone, video
    location_url TEXT,
    location_address TEXT,
    meeting_platform VARCHAR(100), -- zoom, google_meet, teams, phone, etc.
    meeting_id VARCHAR(255),
    meeting_password VARCHAR(255),

    -- Interviewers
    interviewers JSONB DEFAULT '[]', -- Array of interviewer objects {name, role, email}

    -- Preparation
    preparation_notes TEXT,
    resume_version_id UUID,

    -- Follow-up
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    next_steps TEXT,

    -- Reminders
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_timings JSONB DEFAULT '[24, 2, 0.5]', -- Hours before interview: 24h, 2h, 30min
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT valid_scheduled_date CHECK (scheduled_date >= CURRENT_TIMESTAMP)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_date ON interviews(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_user_scheduled ON interviews(user_id, scheduled_date DESC);

-- Create interview_reminders table for tracking sent reminders
CREATE TABLE IF NOT EXISTS interview_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    reminder_timing DECIMAL(5,2) NOT NULL, -- Hours before interview
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
    delivery_method VARCHAR(50) DEFAULT 'in_app', -- in_app, email, push
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for reminders
CREATE INDEX IF NOT EXISTS idx_interview_reminders_interview_id ON interview_reminders(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_reminders_user_id ON interview_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_reminders_scheduled_for ON interview_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_interview_reminders_status ON interview_reminders(status);

-- Create interview_events table for calendar integration
CREATE TABLE IF NOT EXISTS interview_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Calendar integration
    external_calendar_id VARCHAR(255), -- Google Calendar event ID, etc.
    calendar_provider VARCHAR(100), -- google, outlook, apple
    sync_status VARCHAR(50) DEFAULT 'not_synced', -- not_synced, synced, update_required, failed
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,

    -- Event metadata
    event_data JSONB, -- Store full event data from external calendar

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_interview_events_interview_id ON interview_events(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_events_user_id ON interview_events(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_events_calendar_provider ON interview_events(calendar_provider);
CREATE INDEX IF NOT EXISTS idx_interview_events_sync_status ON interview_events(sync_status);

-- Add comments for documentation
COMMENT ON TABLE interviews IS 'Store scheduled interviews with detailed information';
COMMENT ON COLUMN interviews.interview_type IS 'Type of interview: screening, technical, behavioral, panel, onsite, final';
COMMENT ON COLUMN interviews.status IS 'Current status: scheduled, confirmed, completed, cancelled, rescheduled';
COMMENT ON COLUMN interviews.location_type IS 'Where interview takes place: remote, in_person, phone, video';
COMMENT ON COLUMN interviews.reminder_timings IS 'Array of hours before interview to send reminders';
COMMENT ON COLUMN interviews.rating IS 'User rating after interview completion (1-5)';

COMMENT ON TABLE interview_reminders IS 'Track reminder notifications for interviews';
COMMENT ON COLUMN interview_reminders.reminder_timing IS 'Hours before interview to send reminder';
COMMENT ON COLUMN interview_reminders.delivery_method IS 'How reminder was sent: in_app, email, push';

COMMENT ON TABLE interview_events IS 'Integration with external calendar services';
COMMENT ON COLUMN interview_events.external_calendar_id IS 'Event ID from external calendar service';
COMMENT ON COLUMN interview_events.calendar_provider IS 'External calendar: google, outlook, apple';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_interviews_updated_at();

CREATE TRIGGER trigger_update_interview_events_updated_at
    BEFORE UPDATE ON interview_events
    FOR EACH ROW
    EXECUTE FUNCTION update_interviews_updated_at();