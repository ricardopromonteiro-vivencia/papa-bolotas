# Authentication Quick Reference
## Task 2.3: Supabase Auth Configuration

### 🚀 Quick Setup (15 minutes)

#### 1. Run Migration
```sql
-- In Supabase SQL Editor
-- Execute: migrations/005_auth_configuration.sql
```

#### 2. Dashboard Settings

**Authentication → Providers → Email:**
- ✅ Enable email provider
- ❌ Disable email confirmations
- ✅ Enable secure email change

**Authentication → Settings:**
- JWT Expiry: `43200` seconds (12 hours)
- Password minimum: `8` characters
- ✅ Require numbers

#### 3. Create Admin User
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.users (id, username, password_hash, role, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'admin',
  crypt('YourPassword123', gen_salt('bf')),
  'admin',
  NOW(),
  NOW()
);
```
**Replace `YourPassword123` with your password!**

#### 4. Update .env.local
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SESSION_TIMEOUT_HOURS=12
```

#### 5. Verify
```sql
-- Should return 6
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'validate_password_complexity',
    'log_auth_event',
    'check_rate_limit',
    'record_failed_login',
    'cleanup_failed_login_attempts',
    'is_session_valid'
  );

-- Should return admin user
SELECT username, role FROM public.users WHERE username = 'admin';
```

---

### 📋 Configuration Summary

| Feature | Value |
|---------|-------|
| **Session Timeout** | 12 hours |
| **Password Min Length** | 8 characters |
| **Password Requirements** | Letters + Numbers |
| **Rate Limit (Username)** | 5 attempts / 15 min |
| **Rate Limit (IP)** | 10 attempts / 15 min |
| **Failed Login Retention** | 30 days |
| **Audit Log Retention** | 90 days |

---

### 🔐 Security Functions

```sql
-- Validate password
SELECT validate_password_complexity('Test123'); -- Returns TRUE

-- Check rate limit
SELECT check_rate_limit('username', '192.168.1.1'::INET);

-- Record failed login
SELECT record_failed_login('username', '192.168.1.1'::INET);

-- Check session validity
SELECT is_session_valid(user_id, NOW() - INTERVAL '11 hours'); -- TRUE
SELECT is_session_valid(user_id, NOW() - INTERVAL '13 hours'); -- FALSE

-- Log auth event
SELECT log_auth_event(user_id, 'login_success', TRUE, '192.168.1.1'::INET);

-- Cleanup old records
SELECT cleanup_failed_login_attempts();
```

---

### 🧪 Testing Commands

```sql
-- Test password validation
SELECT 
  password,
  validate_password_complexity(password) as valid
FROM (VALUES 
  ('Admin123'),      -- Valid
  ('Short1'),        -- Invalid (too short)
  ('NoNumbers'),     -- Invalid (no numbers)
  ('12345678')       -- Invalid (no letters)
) AS t(password);

-- Check admin user password
SELECT 
  username,
  password_hash = crypt('YourPassword', password_hash) AS matches
FROM public.users
WHERE username = 'admin';

-- View failed login attempts
SELECT username, ip_address, attempt_time
FROM failed_login_attempts
WHERE attempt_time > NOW() - INTERVAL '1 hour'
ORDER BY attempt_time DESC;

-- View auth audit logs
SELECT action, details, created_at
FROM audit_logs
WHERE entity_type = 'auth'
ORDER BY created_at DESC
LIMIT 10;
```

---

### 🔧 Troubleshooting

**Problem:** Migration fails  
**Solution:** Check if previous migrations (001-004) were run first

**Problem:** Can't create admin user  
**Solution:** Run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first

**Problem:** Password doesn't match  
**Solution:** 
```sql
-- Reset password
UPDATE public.users 
SET password_hash = crypt('NewPassword123', gen_salt('bf'))
WHERE username = 'admin';
```

**Problem:** Too many failed login attempts  
**Solution:**
```sql
-- Clear failed attempts for user
DELETE FROM failed_login_attempts WHERE username = 'admin';
```

**Problem:** Session timeout not working  
**Solution:** Check JWT expiry in Supabase Dashboard → Authentication → Settings

---

### 📚 Documentation Files

- `AUTH_SETUP_GUIDE.md` - Complete setup instructions
- `TASK_2.3_COMPLETE.md` - Implementation summary
- `migrations/005_auth_configuration.sql` - SQL migration

---

### ✅ Completion Checklist

- [ ] Migration 005 executed successfully
- [ ] Email provider enabled in dashboard
- [ ] Session timeout set to 43200 seconds
- [ ] Password requirements configured
- [ ] Admin user created
- [ ] Password validated and works
- [ ] Environment variables configured
- [ ] All 6 functions exist in database
- [ ] `failed_login_attempts` table exists
- [ ] Verification queries pass

---

### 🎯 Next Steps

1. **Task 2.4** - Initialize Supabase client in React app
2. **Task 5.1** - Create authentication service
3. **Task 5.2** - Build login form component

---

**For detailed instructions, see `AUTH_SETUP_GUIDE.md`**
