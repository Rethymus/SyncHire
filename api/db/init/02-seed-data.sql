-- Seed data for development (optional)
-- This file is only for development/testing purposes

-- Insert test user (password: test123)
INSERT INTO users (email, password_hash, full_name)
VALUES ('test@synchire.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eDa.B0qz.DQG', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- Insert sample job description
INSERT INTO job_descriptions (user_id, company_name, job_title, description, requirements)
SELECT
    u.id,
    'TechCorp Inc.',
    'Senior Frontend Developer',
    'We are looking for a Senior Frontend Developer to join our team...',
    '5+ years React experience, TypeScript proficiency, cloud experience'
FROM users u
WHERE u.email = 'test@synchire.com'
ON CONFLICT DO NOTHING;
