# Supabase Setup Instructions for Papa Bolotas Webapp

This guide walks you through setting up your Supabase project and database schema for the Papa Bolotas Progressive Web Application.

## 📋 Prerequisites

- A Supabase account (free tier is sufficient)
- Node.js 16+ installed (for password hash generation)
- Internet connection

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Sign in or create a free account

2. **Create New Project**
   - Click the **"New Project"** button
   - Fill in the project details:
     - **Name**: `papa-bolotas-webapp` (or your preferred name)
     - **Database Password**: Choose a **strong password** and save it securely
     - **Region**: Select the region closest to your users (e.g., `Europe West` for Portugal)
     - **Pricing Plan**: Select **Free** tier to start

3. **Wait for Provisioning**
   - The project will take 2-3 minutes to set up
   - You'll see a progress indicator while it's being created

### Step 2: Generate Admin Password Hash

Before running the database migrations, you need to generate a secure password hash for the admin user.

1. **Navigate to Scripts Directory**
   ```powershell
   cd supabase\scripts
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Generate Password Hash**
   ```powershell
   npm run generate-hash
   ```

4. **Enter Your Admin Password**
   - When prompted, enter a secure password (minimum 8 characters, alphanumeric)
   - Example: `PapaBolotasAdmin2024!`
   - **IMPORTANT**: Save this password securely - you'll use it to log into the app

5. **Copy the Generated Hash**
   - The script will output a bcrypt hash
   - Copy this hash - you'll need it in the next step
   - Example output: `$2a$10$abcd1234...`

### Step 3: Execute Database Migrations

Now you'll run the SQL migration files to create the database schema.

1. **Open Supabase SQL Editor**
   - In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
   - You should see an empty SQL editor

2. **Run Migration 001: Initial Schema**
   - Open the file: `supabase/migrations/001_initial_schema.sql`
   - Copy the **entire contents** of the file
   - Paste into the Supabase SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)
   - Wait for confirmation message: "Success. No rows returned"
   
   This creates:
   - All 8 database tables (users, sessions, menu_items, orders, order_items, stock_adjustments, audit_logs, sync_metadata)
   - Primary keys and foreign key relationships
   - Check constraints for data validation
   - Indexes for query performance
   - Row Level Security (RLS) policies

3. **Run Migration 002: Triggers**
   - Open the file: `supabase/migrations/002_triggers.sql`
   - Copy the **entire contents** of the file
   - Paste into the SQL Editor
   - Click **"Run"**
   
   This creates:
   - Automatic `updated_at` timestamp triggers
   - Automatic version increment triggers (for optimistic locking)
   - Audit logging triggers for menu items, orders, and stock adjustments

4. **Run Migration 003: Seed Data**
   - Open the file: `supabase/migrations/003_seed_data.sql`
   - Copy the **entire contents** of the file
   - **IMPORTANT**: Find the line with `$2a$10$YourHashedPasswordHere`
   - **Replace** that placeholder with the hash you generated in Step 2
   - Example:
     ```sql
     -- BEFORE:
     VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'admin', NOW(), NOW())
     
     -- AFTER (use your actual hash):
     VALUES ('admin', '$2a$10$XzG8f3kL9mP2qR7sT4vW6uYyxC...', 'admin', NOW(), NOW())
     ```
   - Paste the modified SQL into the editor
   - Click **"Run"**
   
   This creates:
   - Initial admin user with your password
   - Helpful database views for reporting
   - Stock status views

5. **Run Migration 004: Performance Optimization** (Optional but Recommended)
   - Open the file: `supabase/migrations/004_performance_optimization.sql`
   - Copy the **entire contents** of the file
   - Paste into the SQL Editor
   - Click **"Run"**
   
   This creates:
   - Additional composite indexes for common query patterns
   - Materialized views for faster dashboard queries
   - Utility functions for getting orders and session summaries
   - Optimized autovacuum settings

### Step 4: Verify Database Setup

Run the verification script to ensure everything is set up correctly.

1. **Open SQL Editor**
   - Still in the SQL Editor from the previous step

2. **Run Verification Script**
   - Open the file: `supabase/migrations/999_verification.sql`
   - Copy the **entire contents** of the file
   - Paste into the SQL Editor
   - Click **"Run"**

3. **Review the Results**
   - You should see multiple sections verifying:
     - ✅ 8 tables created
     - ✅ Multiple indexes per table
     - ✅ Foreign key constraints
     - ✅ Triggers configured
     - ✅ RLS enabled on all tables
     - ✅ RLS policies configured
     - ✅ Custom functions available
     - ✅ Views for reporting
     - ✅ 1 admin user exists

4. **Quick Manual Check**
   Run this simple query to verify your admin user:
   ```sql
   SELECT username, role, created_at FROM users;
   ```
   
   Expected result: 1 row showing `admin` user

### Step 5: Get API Credentials

Now you need to get the API keys to connect your webapp to Supabase.

1. **Navigate to Project Settings**
   - Click **"Settings"** (gear icon) in the left sidebar
   - Click **"API"** under Project Settings

2. **Copy Your Credentials**
   You'll need two pieces of information:
   
   - **Project URL**
     - Found under "Project URL"
     - Format: `https://xxxxxxxxxxxxx.supabase.co`
     - Copy this entire URL
   
   - **anon/public key**
     - Found under "Project API keys"
     - Look for the key labeled `anon` `public`
     - It's a long string starting with `eyJ...`
     - Click the copy button
   
   **⚠️ IMPORTANT**: 
   - Do NOT copy the `service_role` key - that's for server-side use only
   - Never commit these keys to version control
   - The `anon` key is safe to use in your client-side code

### Step 6: Configure Your Webapp

Now configure your webapp to connect to Supabase.

1. **Navigate to Webapp Directory**
   ```powershell
   cd ..\..\webapp
   ```

2. **Create Environment File**
   - If `.env.local` doesn't exist, create it:
     ```powershell
     New-Item -Path .env.local -ItemType File
     ```

3. **Add Your Credentials**
   - Open `.env.local` in your text editor
   - Add the following lines (replace with your actual values):
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Verify `.env.local` is in `.gitignore`**
   - Open `.gitignore` in the webapp directory
   - Ensure it contains `.env.local`
   - If not, add it:
     ```
     .env.local
     ```

### Step 7: Configure Supabase Authentication Settings

Configure session timeout and password requirements.

1. **Navigate to Authentication Settings**
   - In Supabase dashboard, click **"Authentication"** in the left sidebar
   - Click **"Settings"** (under Authentication)

2. **Configure Session Settings**
   - Scroll to **"JWT Settings"**
   - Set **JWT expiry limit**: `43200` seconds (12 hours)
   - This ensures users stay logged in for a full work session

3. **Configure Email Settings**
   - Under **"Auth Providers"**, ensure **Email** is enabled
   - Turn OFF **"Enable email confirmations"** (since this is an internal tool)
   - Turn ON **"Enable email signups"** if you want to create users via email

4. **Save Changes**
   - Click **"Save"** at the bottom of the page

### Step 8: Test Database Connection

Test that your webapp can connect to the database.

1. **Start the Development Server**
   ```powershell
   npm run dev
   ```

2. **Open the Application**
   - The dev server will show you a URL (typically `http://localhost:5173`)
   - Open this URL in your browser

3. **Try Logging In**
   - You should see a login page
   - Username: `admin`
   - Password: (the password you created in Step 2)
   - Click "Login"

4. **Verify Connection**
   - If login succeeds, your database connection is working! ✅
   - If you get an error, check:
     - Are the environment variables correct in `.env.local`?
     - Is your Supabase project still running (not paused)?
     - Did you copy the `anon` key (not the `service_role` key)?

## 🎉 Setup Complete!

Your Supabase database is now fully configured and ready to use. The webapp has:

✅ Complete database schema with 8 tables
✅ Row Level Security enabled for data protection
✅ Automatic audit logging for all changes
✅ Performance optimizations and indexes
✅ Admin user account ready to use
✅ Secure connection to your webapp

## 📊 Database Schema Overview

Your database includes these tables:

| Table | Purpose |
|-------|---------|
| `users` | Admin user accounts |
| `sessions` | Work session tracking |
| `menu_items` | Products/menu items with prices and stock |
| `orders` | Customer orders |
| `order_items` | Individual items within orders |
| `stock_adjustments` | Inventory change tracking |
| `audit_logs` | Security and change audit trail |
| `sync_metadata` | Offline synchronization tracking |

## 🔐 Security Features

Your database has these security features enabled:

- **Row Level Security (RLS)**: Ensures users can only access their own data
- **Audit Logging**: All changes to menu items, orders, and stock are logged
- **Password Hashing**: User passwords stored as bcrypt hashes
- **Session Management**: Automatic session timeout after 12 hours
- **Input Validation**: Database constraints prevent invalid data

## 📖 Next Steps

Now that your database is set up:

1. **Import Existing Data** (if you have data from the desktop app)
   - Use the data migration tools in task 20.1-20.4
   
2. **Configure Realtime Subscriptions**
   - Go to Database → Replication in Supabase
   - Enable realtime for tables that need live updates
   
3. **Set Up Monitoring**
   - Review the Dashboard in Supabase to monitor usage
   - Check the Logs section for any errors

4. **Continue Implementation**
   - Proceed with the remaining tasks in the implementation plan
   - Tasks 2.2, 2.3, 2.4 will build on this database foundation

## 🆘 Troubleshooting

### Issue: "relation does not exist" error
**Solution**: Make sure you ran all migration files in order (001, 002, 003, 004)

### Issue: Can't login with admin user
**Solution**: 
- Verify you replaced the password hash in migration 003
- Check that the password you're using matches what you entered in the hash generator
- Run: `SELECT username, role FROM users;` in SQL Editor to confirm user exists

### Issue: "Failed to fetch" or connection errors
**Solution**:
- Verify `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check that your Supabase project is not paused (free tier pauses after 7 days of inactivity)
- Ensure you're using the `anon` key, not `service_role` key

### Issue: Permission denied errors
**Solution**:
- RLS policies may not be configured correctly
- Re-run migration 001 which includes RLS policies
- Check policies: `SELECT * FROM pg_policies WHERE tablename = 'menu_items';`

### Issue: Slow queries
**Solution**: 
- Run migration 004 (performance optimization)
- Run `ANALYZE;` in SQL Editor to update statistics
- Check indexes exist: Go to Database → Indexes in dashboard

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/sql-editor)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Papa Bolotas Design Document](../.kiro/specs/papa-bolotas-webapp/design.md)

## 🔄 Database Maintenance

### Regular Tasks
- Monitor database size in Supabase dashboard
- Review audit logs periodically for security
- Check slow query logs for performance issues

### Backup Strategy
- Supabase automatically backs up your database
- For production, consider enabling Point-in-Time Recovery (PITR)
- Export critical data regularly for compliance

---

**✅ Task 2.1 Complete**: Supabase project created and database schema configured!

Now ready to proceed with task 2.2 (Configure Row Level Security policies) and beyond.
