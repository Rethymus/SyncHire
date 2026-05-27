-- Migration: Add saved searches and search analytics
-- Created: 2026-05-26
-- Description: Create tables for saved searches, search history, and search analytics

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_query TEXT NOT NULL,
    filters JSONB NOT NULL, -- Store all filter parameters
    notify_matches BOOLEAN DEFAULT false,
    notification_frequency VARCHAR(20) DEFAULT 'daily', -- immediate, daily, weekly
    last_notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters JSONB, -- Store applied filters
    results_count INTEGER NOT NULL,
    clicked_result_id UUID,
    clicked_result_type VARCHAR(20), -- 'resume', 'jd', 'application'
    search_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create search_analytics table (aggregated data)
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_term TEXT NOT NULL,
    search_type VARCHAR(20) NOT NULL, -- 'resume', 'jd', 'application'
    total_searches INTEGER NOT NULL DEFAULT 1,
    total_results INTEGER NOT NULL DEFAULT 0,
    zero_result_searches INTEGER NOT NULL DEFAULT 0,
    avg_results_per_search DECIMAL(10,2),
    click_through_rate DECIMAL(5,2),
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(search_term, search_type)
);

-- Create indexes for saved_searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id
    ON saved_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_notify_matches
    ON saved_searches(user_id, notify_matches, last_notified_at)
    WHERE notify_matches = true;

CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at
    ON saved_searches(created_at DESC);

-- Create indexes for search_history
CREATE INDEX IF NOT EXISTS idx_search_history_user_id
    ON search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_created_at
    ON search_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_clicked_result
    ON search_history(clicked_result_id, clicked_result_type)
    WHERE clicked_result_id IS NOT NULL;

-- Create indexes for search_analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_type
    ON search_analytics(search_type);

CREATE INDEX IF NOT EXISTS idx_search_analytics_total_searches
    ON search_analytics(total_searches DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_zero_results
    ON search_analytics(zero_result_searches DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_last_searched
    ON search_analytics(last_searched_at DESC);

-- Create index on search_history filters for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_history_filters
    ON search_history USING GIN (filters);

-- Create index on saved_searches filters for matching queries
CREATE INDEX IF NOT EXISTS idx_saved_searches_filters
    ON saved_searches USING GIN (filters);

-- Add comments for documentation
COMMENT ON TABLE saved_searches IS 'User-saved search queries with filters for re-use and notifications';
COMMENT ON TABLE search_history IS 'Log of all searches performed by users for analytics';
COMMENT ON TABLE search_analytics IS 'Aggregated search statistics for analytics and optimization';

COMMENT ON COLUMN saved_searches.name IS 'User-defined name for the saved search';
COMMENT ON COLUMN saved_searches.search_query IS 'The main search query text';
COMMENT ON COLUMN saved_searches.filters IS 'JSON object containing all applied filters';
COMMENT ON COLUMN saved_searches.notify_matches IS 'Whether to send notifications for new matching results';
COMMENT ON COLUMN saved_searches.notification_frequency IS 'How often to check for new matches: immediate, daily, weekly';
COMMENT ON COLUMN saved_searches.last_notified_at IS 'When the user was last notified about new matches';

COMMENT ON COLUMN search_history.search_query IS 'The search query text';
COMMENT ON COLUMN search_history.filters IS 'JSON object containing applied filters';
COMMENT ON COLUMN search_history.results_count IS 'Number of results returned';
COMMENT ON COLUMN search_history.clicked_result_id IS 'ID of the result clicked by user (if any)';
COMMENT ON COLUMN search_history.clicked_result_type IS 'Type of result clicked: resume, jd, application';
COMMENT ON COLUMN search_history.search_duration_ms IS 'Time taken to execute search in milliseconds';

COMMENT ON COLUMN search_analytics.search_term IS 'The search term (may be normalized)';
COMMENT ON COLUMN search_analytics.search_type IS 'Type of search: resume, jd, application';
COMMENT ON COLUMN search_analytics.total_searches IS 'Total number of times this term was searched';
COMMENT ON COLUMN search_analytics.total_results IS 'Total results across all searches';
COMMENT ON COLUMN search_analytics.zero_result_searches IS 'Number of searches that returned zero results';
COMMENT ON COLUMN search_analytics.avg_results_per_search IS 'Average number of results per search';
COMMENT ON COLUMN search_analytics.click_through_rate IS 'Percentage of searches that resulted in a click';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_analytics_updated_at
    BEFORE UPDATE ON search_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
