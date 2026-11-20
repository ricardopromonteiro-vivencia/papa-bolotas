# Task 2.3 Setup Checklist
## Supabase Authentication Configuration

Use this checklist to track your progress through the authentication setup.

---

## 📋 Pre-Setup Verification

- [ ] Supabase project exists and is accessible
- [ ] Database migrations 001-004 already executed (Task 2.1)
- [ ] Can access Supabase SQL Editor
- [ ] Can access Supabase Dashboard
- [ ] Have admin access to the project

---

## 🔧 Step 1: Execute Authentication Migration (5 minutes)

- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Open file: `migrations/005_auth_configuration.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click **Run** (or Ctrl+Enter)
- [ ] Verify success messages appear:
  - [ ] "Password validation function tests passed"
  - [ ] "Rate limiting function tests passed"
  - [ ] "Authentication Configuration Complete"

### Verification:
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
```

- [ ] Verification query returns 6 functions

---

## ⚙️ Step 2: Configure Supabase Dashboard (5 minutes)

### Email Provider Settings
- [ ] Go to **Authentication** → **Providers**
- [ ] Find **Email** provider
- [ ] Verify it's **Enabled** ✅
- [ ] Click on **Email** to configure
- [ ] Set: **Enable email provider** = ON
- [ ] Set: **Confirm email** = OFF (internal app)
- [ ] Set: **Enable email confirmations** = OFF
- [ ] Set: **Secure email change** = ON
- [ ] Click **Save**

### Session Settings
- [ ] Go to **Authentication** → **Settings**
- [ ] Find **Session Management** section
- [ ] Set: **JWT expiry** = `43200` seconds (12 hours)
- [ ] Set: **Refresh token reuse interval** = `10` seconds
- [ ] Set: **Refresh token rotation** = Enabled ✅
- [ ] Click **Save**

### Password Settings
- [ ] Still in **Authentication** → **Settings**
- [ ] Find **Password** section
- [ ] Set: **Minimum password length** = `8` characters
- [ ] Set: **Require numbers** = Enabled ✅
- [ ] (Optional) Set: **Require lowercase** = Enabled ✅
- [ ] Click **Save**

---

## 👤 Step 3: Create Admin User (3 minutes)

### Choose Method:

#### Option A: SQL Method (Recommended)
- [ ] Decide on admin password (min 8 chars, alphanumeric)
- [ ] Open Supabase SQL Editor
- [ ] Run this SQL (replace `YourPassword123` with your password):
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.users (
  id,
  username,
  password_hash,
  role,
  created_at,
  updated_at
)
VALUES (
  uuid_generate_v4(),
  'admin',
  crypt('YourPassword123', gen_salt('bf')),
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO NOTHING;
```
- [ ] Query executes successfully
- [ ] **IMPORTANT**: Save password securely!

#### Option B: Dashboard Method
- [ ] Go to **Authentication** → **Users**
- [ ] Click **Add User** → **Create new user**
- [ ] Enter email: `admin@papabolotas.com`
- [ ] Enter password (your chosen password)
- [ ] Check: **Auto Confirm User** ✅
- [ ] Click **Create User**
- [ ] Note the user ID
- [ ] Run SQL to link to public.users table

### Verification:
```sql
-- Should return 1 row with admin user
SELECT id, username, role, created_at
FROM public.users
WHERE username = 'admin';
```

- [ ] Admin user appears in database
- [ ] Password saved securely (write it down or use password manager)

---

## 🧪 Step 4: Test Password (2 minutes)

- [ ] Run password test in SQL Editor:
```sql
-- Should return TRUE
SELECT 
  username,
  password_hash = crypt('YourPassword123', password_hash) AS password_matches
FROM public.users
WHERE username = 'admin';
```

- [ ] Result shows `password_matches = t` (true)

---

## 🌐 Step 5: Configure Environment Variables (2 minutes)

### Get API Credentials
- [ ] Go to **Settings** → **API** in Supabase Dashboard
- [ ] Copy **Project URL**: `https://xxxxx.supabase.co`
- [ ] Copy **anon/public key**: `eyJhb...`

### Update .env.local
- [ ] Navigate to `webapp` directory
- [ ] Open or create `.env.local` file
- [ ] Add these variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SECURITY_CODE=1234
VITE_SESSION_TIMEOUT_HOURS=12
```
- [ ] Replace placeholders with actual values
- [ ] Save file

### Verify .gitignore
- [ ] Check `webapp/.gitignore` contains:
```
.env.local
.env*.local
```
- [ ] Add if missing

---

## ✅ Step 6: Run Verification Script (2 minutes)

- [ ] Open Supabase SQL Editor
- [ ] Open file: `migrations/006_verify_auth_setup.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click **Run**
- [ ] Review output messages

### Expected Results:
- [ ] "Authentication Functions: ✅ ALL FUNCTIONS PRESENT"
- [ ] "failed_login_attempts table - Found"
- [ ] "users table - Found"
- [ ] "RLS enabled on failed_login_attempts"
- [ ] "Admin user exists" (or warning if not created)
- [ ] "Password validation - PASS" (all 4 tests)
- [ ] "Rate limit check - PASS"
- [ ] "Session validation - PASS" (both tests)
- [ ] "Overall Status: ✅ AUTHENTICATION SETUP COMPLETE"

---

## 🎯 Step 7: Final Verification (1 minute)

### Quick Tests
- [ ] Run this comprehensive check:
```sql
-- Quick comprehensive verification
SELECT 
  'Functions' as component,
  COUNT(*)::TEXT || '/6' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'validate_password_complexity',
    'log_auth_event',
    'check_rate_limit',
    'record_failed_login',
    'cleanup_failed_login_attempts',
    'is_session_valid'
  )
UNION ALL
SELECT 
  'Admin User',
  CASE WHEN COUNT(*) > 0 THEN '✅ Created' ELSE '❌ Missing' END
FROM public.users
WHERE username = 'admin'
UNION ALL
SELECT 
  'Table',
  CASE WHEN COUNT(*) > 0 THEN '✅ Created' ELSE '❌ Missing' END
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'failed_login_attempts';
```

### Results Should Show:
- [ ] Functions: 6/6
- [ ] Admin User: ✅ Created
- [ ] Table: ✅ Created

---

## 📝 Post-Setup Documentation

- [ ] Admin username documented: `admin`
- [ ] Admin password saved securely
- [ ] Supabase URL saved: `____________________`
- [ ] Supabase anon key saved: `____________________`
- [ ] JWT expiry confirmed: 43200 seconds
- [ ] Rate limits understood: 5 per user, 10 per IP

---

## 🔒 Security Checklist

- [ ] Password complexity requirements enforced (8+ chars, alphanumeric)
- [ ] Session timeout configured (12 hours)
- [ ] Rate limiting enabled (5/15min per username, 10/15min per IP)
- [ ] Failed login attempts are logged
- [ ] Audit trail enabled for auth events
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Environment variables not committed to Git
- [ ] `.env.local` in `.gitignore`

---

## 🎓 Knowledge Verification

- [ ] I understand password requirements (8+ chars, alphanumeric)
- [ ] I know how to reset admin password if needed
- [ ] I understand session timeout (12 hours of inactivity)
- [ ] I know where to view failed login attempts
- [ ] I know how to clear rate limits if needed
- [ ] I understand what each auth function does

---

## 🚀 Next Steps

- [ ] Task 2.4: Initialize Supabase client in React application
- [ ] Task 5.1: Create authentication service
- [ ] Task 5.2: Build login form component
- [ ] Task 5.3: Implement protected route wrapper

---

## 📚 Reference Documents

Keep these handy:

- [ ] `AUTH_SETUP_GUIDE.md` - Full setup instructions
- [ ] `AUTH_QUICK_REFERENCE.md` - Quick command reference
- [ ] `TASK_2.3_COMPLETE.md` - Implementation details
- [ ] `AUTHENTICATION_README.md` - Overview and navigation

---

## ⏱️ Time Tracking

| Step | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| 1. Execute Migration | 5 min | ___ min | |
| 2. Configure Dashboard | 5 min | ___ min | |
| 3. Create Admin User | 3 min | ___ min | |
| 4. Test Password | 2 min | ___ min | |
| 5. Environment Vars | 2 min | ___ min | |
| 6. Run Verification | 2 min | ___ min | |
| 7. Final Check | 1 min | ___ min | |
| **Total** | **20 min** | **___ min** | |

---

## ✅ Completion Confirmation

Once all items above are checked:

- [ ] All checklist items completed ✅
- [ ] All verification queries pass ✅
- [ ] Admin user can log in ✅
- [ ] Documentation reviewed ✅
- [ ] Ready for Task 2.4 ✅

**Task 2.3 Status**: ⬜ Not Started | ⬜ In Progress | ✅ **COMPLETE**

---

## 🆘 Troubleshooting Reference

If you encounter issues:

1. **Migration fails**: Check if migrations 001-004 were run first
2. **Function missing**: Re-run migration 005
3. **Can't create admin**: Ensure pgcrypto extension is enabled
4. **Password doesn't work**: Verify using password test query
5. **Rate limited**: Clear failed attempts for your username

See `AUTH_SETUP_GUIDE.md` for detailed troubleshooting.

---

## 📞 Support Resources

- Supabase Docs: https://supabase.com/docs/guides/auth
- Project Documentation: `AUTH_SETUP_GUIDE.md`
- Verification Script: `migrations/006_verify_auth_setup.sql`

---

**Last Updated**: Task 2.3 Implementation  
**Version**: 1.0  
**Status**: Ready for Execution ✅
