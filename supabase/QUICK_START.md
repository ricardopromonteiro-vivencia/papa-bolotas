# Supabase Quick Start Guide

This is a condensed guide to get your Papa Bolotas database up and running quickly.

## ⚡ Quick Setup (5 minutes)

### 1. Create Project
- Go to [Supabase Dashboard](https://app.supabase.com)
- Click **New Project**
- Enter project name: `papa-bolotas-webapp`
- Set strong database password
- Choose closest region
- Click **Create**

### 2. Run Migrations

Open **SQL Editor** in Supabase dashboard and execute these files in order:

#### ✅ Step 1: Create Tables
Copy-paste contents of `migrations/001_initial_schema.sql` → Run

#### ✅ Step 2: Create Triggers  
Copy-paste contents of `migrations/002_triggers.sql` → Run

#### ✅ Step 3: Seed Data
**First**, generate admin password hash:

```bash
# Option A: Using Node.js (recommended)
cd supabase/scripts
npm install bcrypt
node generate-admin-hash.js

# Option B: Using online tool (testing only)
# Visit https://bcrypt-generator.com/
```

Then:
- Copy contents of `migrations/003_seed_data.sql`
- **Replace** `$2a$10$YourHashedPasswordHere` with your generated hash
- Run in SQL Editor

#### ✅ Step 4: Performance Optimization (Optional)
Copy-paste contents of `migrations/004_performance_optimization.sql` → Run

### 3. Get API Keys

Go to **Settings** → **API**:

```
Project URL: https://xxxxx.supabase.co
anon key: eyJhb...
```

### 4. Configure Your App

Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## ✅ Verify Installation

Run in SQL Editor:

```sql
-- Should return 8 tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return admin user
SELECT username, role FROM users;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```

Expected results:
- 8 tables created ✓
- 1 admin user ✓  
- All tables have `rowsecurity = true` ✓

## 🔐 Security Checklist

- [x] Strong database password set
- [x] Admin user password changed from default
- [x] `.env.local` added to `.gitignore`
- [x] Service role key NOT in client code
- [x] RLS enabled on all tables

## 🎯 Next Steps

1. **Test Connection**: Run your app and try logging in
2. **Import Data**: Use data migration tools to import existing menu
3. **Configure Auth**: Set session timeout in Auth settings (12 hours = 43200 seconds)
4. **Enable Realtime**: Go to Database → Replication → Enable for required tables

## 📊 Database Schema

```
users (auth)
  ↓
sessions (work periods)
  ↓
orders (transactions)
  ↓
order_items (line items) ← menu_items (products)
  ↓
stock_adjustments (inventory changes)
  ↓
audit_logs (security trail)

sync_metadata (offline sync tracking)
```

## 🚨 Troubleshooting

### Can't connect from app?
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check project is not paused (free tier pauses after inactivity)
- Ensure `.env.local` is in project root

### Permission errors?
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'menu_items';

-- Temporarily disable RLS for debugging (re-enable after!)
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
```

### Slow queries?
- Ensure migration 004 (performance optimization) was executed
- Run `ANALYZE` on tables
- Check indexes exist: `\di` in psql or check Database → Indexes

## 📖 Full Documentation

See [README.md](./README.md) for detailed documentation.

## 🆘 Support

- [Supabase Docs](https://supabase.com/docs)
- [Discord Community](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
