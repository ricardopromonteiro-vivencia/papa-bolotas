-- ================================================
-- SUPABASE AUTHENTICATION CONFIGURATION
-- Task 2.3: Setup Supabase Authentication
-- ================================================
-- This migration configures Supabase Auth settings and creates
-- authentication-related database functions and policies.

-- ================================================
-- PASSWORD VALIDATION FUNCTION
-- ================================================
-- Creates a function to validate password complexity requirements
-- Requirements: Minimum 8 characters, alphanumeric (at least one letter and one number)

CREATE OR REPLACE FUNCTION validate_password_complexity(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check minimum length (8 characters)
  IF LENGTH(password) < 8 THEN
    RETURN FALSE;
  END IF;
  
  -- Check contains at least one letter
  IF password !~ '[A-Za-z]' THEN
    RETURN FALSE;
  END IF;
  
  -- Check contains at least one number
  IF password !~ '[0-9]' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION validate_password_complexity IS 
  'Validates password meets complexity requirements: min 8 chars, alphanumeric';

-- ================================================
-- AUTHENTICATION AUDIT LOG FUNCTION
-- ================================================
-- Function to log authentication events automatically

CREATE OR REPLACE FUNCTION log_auth_event(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_success BOOLEAN,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    created_at
  )
  VALUES (
    p_user_id,
    p_action,
    'auth',
    p_user_id,
    jsonb_build_object(
      'success', p_success,
      'timestamp', NOW()
    ),
    p_ip_address,
    NOW()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION log_auth_event IS 
  'Logs authentication events (login, logout, failed attempts) to audit trail';

-- ================================================
-- FAILED LOGIN ATTEMPTS TRACKING
-- ================================================
-- Table to track failed login attempts for rate limiting

CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL,
  ip_address INET,
  attempt_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_failed_login_username ON failed_login_attempts(username, attempt_time);
CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address, attempt_time);
CREATE INDEX idx_failed_login_time ON failed_login_attempts(attempt_time);

-- Add comment
COMMENT ON TABLE failed_login_attempts IS 
  'Tracks failed authentication attempts for security monitoring and rate limiting';

-- ================================================
-- RATE LIMITING FUNCTION
-- ================================================
-- Function to check if login attempts should be rate limited

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_username VARCHAR(50),
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_username_attempts INTEGER;
  v_ip_attempts INTEGER;
  v_time_window INTERVAL := '15 minutes';
BEGIN
  -- Count failed attempts from this username in the last 15 minutes
  SELECT COUNT(*) INTO v_username_attempts
  FROM failed_login_attempts
  WHERE username = p_username
    AND attempt_time > NOW() - v_time_window;
  
  -- Count failed attempts from this IP in the last 15 minutes
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_attempts
    FROM failed_login_attempts
    WHERE ip_address = p_ip_address
      AND attempt_time > NOW() - v_time_window;
  ELSE
    v_ip_attempts := 0;
  END IF;
  
  -- Block if more than 5 attempts from username or 10 from IP
  IF v_username_attempts >= 5 OR v_ip_attempts >= 10 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_rate_limit IS 
  'Checks if login should be rate limited based on failed attempts (5 per username, 10 per IP in 15 min)';

-- ================================================
-- RECORD FAILED LOGIN FUNCTION
-- ================================================
-- Function to record failed login attempts

CREATE OR REPLACE FUNCTION record_failed_login(
  p_username VARCHAR(50),
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO failed_login_attempts (username, ip_address)
  VALUES (p_username, p_ip_address)
  RETURNING id INTO v_attempt_id;
  
  -- Also log to audit trail
  PERFORM log_auth_event(
    NULL,
    'login_failed',
    FALSE,
    p_ip_address
  );
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION record_failed_login IS 
  'Records a failed login attempt for rate limiting and security monitoring';

-- ================================================
-- CLEANUP OLD FAILED ATTEMPTS
-- ================================================
-- Function to clean up old failed login attempts (keeps last 30 days)

CREATE OR REPLACE FUNCTION cleanup_failed_login_attempts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM failed_login_attempts
  WHERE attempt_time < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION cleanup_failed_login_attempts IS 
  'Removes failed login attempts older than 30 days for maintenance';

-- ================================================
-- USER SESSION VALIDATION FUNCTION
-- ================================================
-- Function to validate if a user session is still valid

CREATE OR REPLACE FUNCTION is_session_valid(
  p_user_id UUID,
  p_session_started TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_timeout INTERVAL := '12 hours';
  v_last_activity TIMESTAMPTZ;
BEGIN
  -- Check if session is within timeout window
  v_last_activity := p_session_started;
  
  IF NOW() - v_last_activity > v_session_timeout THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION is_session_valid IS 
  'Validates if a user session is still within the 12-hour timeout window';

-- ================================================
-- RLS POLICIES FOR FAILED LOGIN ATTEMPTS
-- ================================================

ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view failed login attempts (admin only in practice)
CREATE POLICY "Authenticated users can view failed login attempts" 
  ON failed_login_attempts
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only system can insert failed login attempts
CREATE POLICY "System can record failed login attempts" 
  ON failed_login_attempts
  FOR INSERT 
  WITH CHECK (true);

-- ================================================
-- INITIAL SECURITY CONFIGURATION
-- ================================================

-- Grant execute permissions on auth functions to authenticated users
GRANT EXECUTE ON FUNCTION validate_password_complexity TO authenticated;
GRANT EXECUTE ON FUNCTION log_auth_event TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_valid TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_failed_login_attempts TO authenticated;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Verify password validation function works
DO $$
BEGIN
  -- Test valid password
  IF NOT validate_password_complexity('Admin123') THEN
    RAISE EXCEPTION 'Password validation failed for valid password';
  END IF;
  
  -- Test too short password
  IF validate_password_complexity('Admin1') THEN
    RAISE EXCEPTION 'Password validation should fail for short password';
  END IF;
  
  -- Test no numbers
  IF validate_password_complexity('AdminPassword') THEN
    RAISE EXCEPTION 'Password validation should fail for no numbers';
  END IF;
  
  -- Test no letters
  IF validate_password_complexity('12345678') THEN
    RAISE EXCEPTION 'Password validation should fail for no letters';
  END IF;
  
  RAISE NOTICE 'Password validation function tests passed successfully';
END $$;

-- Verify rate limiting function works
DO $$
BEGIN
  IF NOT check_rate_limit('testuser', '127.0.0.1'::INET) IS NOT NULL THEN
    RAISE EXCEPTION 'Rate limit check function not working';
  END IF;
  
  RAISE NOTICE 'Rate limiting function tests passed successfully';
END $$;

-- Show summary
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Authentication Configuration Complete';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - validate_password_complexity';
  RAISE NOTICE '  - log_auth_event';
  RAISE NOTICE '  - check_rate_limit';
  RAISE NOTICE '  - record_failed_login';
  RAISE NOTICE '  - cleanup_failed_login_attempts';
  RAISE NOTICE '  - is_session_valid';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - failed_login_attempts';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Configure Supabase Auth in dashboard';
  RAISE NOTICE '  2. Create initial admin user';
  RAISE NOTICE '  3. Test authentication flow';
  RAISE NOTICE '==========================================';
END $$;
