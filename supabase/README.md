# Supabase Database Setup Guide

This guide explains how to create and configure the Supabase project for Papa Bolotas Webapp.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Database access credentials

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details:
   - **Name**: papa-bolotas-webapp
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Select the closest region to your users
   - **Pricing Plan**: Free tier is sufficient for getting started
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Execute Database Migrations

Once your project is ready:

1. Navigate to the SQL Editor in your Supabase dashboard
2. Execute the migration files in order:

### Migration 001: Initial Schema

Copy the contents of `migrations/001_initial_schema.sql` and execute in the SQL Editor.

This creates:
- `users` table for authentication
- `sessions` table for tracking work periods
- `menu_items` table for products
- `orders` and `order_items` tables for transactions
- `stock_adjustments` table for inventory tracking
- `audit_logs` table for security and compliance
- `sync_metadata` table for offline synchronization
- All necessary indexes for performance
- Row Level Security (RLS) policies

### Migration 002: Triggers

Copy the contents of `migrations/002_triggers.sql` and execute in the SQL Editor.

This creates:
- Automatic `updated_at` timestamp triggers
- Automatic version increment triggers for optimistic locking
- Audit logging triggers for menu items, orders, and stock adjustments

### Migration 003: Seed Data

Copy the contents of `migrations/003_seed_data.sql` and execute in the SQL Editor.

**Important**: Before executing, update the password hash for the admin user.

Generate a bcrypt hash for your admin password:

```javascript
// Using Node.js
const bcrypt = require('bcrypt');
const password = 'YourStrongPassword123!';
bcrypt.hash(password, 10, (err, hash) => {
  console.log(hash);
});
```

Or use an online bcrypt generator (for testing only):
https://bcrypt-generator.com/

Replace `$2a$10$YourHashedPasswordHere` in the SQL with your generated hash.

This migration also creates:
- Initial admin user
- Helpful database views for reporting
- Sample menu items (commented out - uncomment if desired)

## Step 3: Configure Supabase Authentication

1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Enable **Email** provider (should be enabled by default)
3. Configure settings:
   - **Enable email confirmations**: OFF (for internal use)
   - **Session timeout**: 12 hours (43200 seconds)
   - **Password requirements**: Minimum 8 characters
4. Go to **Authentication** > **Policies**
5. Verify that Row Level Security (RLS) is enabled on all tables

## Step 4: Get API Credentials

1. Go to **Settings** > **API** in Supabase dashboard
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhb...` (starts with eyJ)
   - **service_role key**: Only use this for server-side operations (never expose in client code)

## Step 5: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Add `.env.local` to `.gitignore` to keep credentials secure.

## Step 6: Verify Installation

Run these SQL queries in the SQL Editor to verify everything is set up:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table, trigger_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check admin user exists
SELECT username, role, created_at 
FROM users;
```

Expected results:
- 8 tables: audit_logs, menu_items, order_items, orders, sessions, stock_adjustments, sync_metadata, users
- Multiple indexes on each table
- Multiple triggers for automatic updates and auditing
- RLS enabled (rowsecurity = true) on all tables
- 1 admin user record

## Step 7: Create First Admin User (Alternative Method)

If you prefer to create the admin user through the application:

1. The admin password hash in the seed file is a placeholder
2. You can use Supabase Auth API to create the user programmatically
3. Or use the SQL Editor with a proper bcrypt hash:

```sql
-- Generate a secure hash first using bcrypt
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'admin@papabolotas.com',
  crypt('YourPassword123!', gen_salt('bf')), -- Uses PostgreSQL's pgcrypto
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"admin"}',
  FALSE
);
```

## Database Schema Overview

### Tables and Relationships

```
users (1) ──< sessions (1) ──< orders (1) ──< order_items (*)
                                  │
menu_items (1) ────────────────────┴──< order_items (*)
menu_items (1) ──< stock_adjustments (*)
users (1) ──< audit_logs (*)
```

### Key Features

1. **Referential Integrity**: Foreign keys ensure data consistency
2. **Soft Deletes**: Orders are marked cancelled, not deleted
3. **Audit Trail**: All changes tracked in audit_logs
4. **Optimistic Locking**: Version numbers prevent concurrent update conflicts
5. **Historical Accuracy**: Order items store menu_item_name for price/name changes
6. **Performance**: Strategic indexes on foreign keys and query filters

## Maintenance

### Backup Recommendations

- Supabase automatically backs up your database
- For critical production data, enable Point-in-Time Recovery (PITR) in project settings
- Regular exports recommended for compliance

### Monitoring

Check the Supabase dashboard regularly:
- **Database** > **Usage**: Monitor storage and connections
- **Logs**: Review query performance
- **Reports**: Analyze API usage

## Troubleshooting

### Connection Issues

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check if database is accessible
SELECT current_database(), current_user;
```

### RLS Policy Issues

If queries fail with permission errors:

```sql
-- Temporarily disable RLS for debugging (re-enable after!)
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'menu_items';
```

### Performance Issues

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;
```

## Security Checklist

- [x] Row Level Security (RLS) enabled on all tables
- [x] Proper RLS policies restricting data access
- [x] Passwords hashed with bcrypt
- [x] API keys stored as environment variables
- [x] Service role key never exposed to client
- [x] Audit logging for sensitive operations
- [x] Session timeouts configured (12 hours)

## Next Steps

After completing database setup:

1. Test database connection from your application
2. Import existing data from desktop app (if applicable)
3. Configure real-time subscriptions for multi-device sync
4. Set up monitoring and alerting
5. Plan for scaling (connection pooling, read replicas)

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- PostgreSQL Documentation: https://www.postgresql.org/docs/
