-- ================================================
-- DATABASE VERIFICATION SCRIPT
-- Run this after all migrations to verify setup
-- ================================================

-- Enable expanded display for better readability
\x on

-- ================================================
-- 1. CHECK TABLES
-- ================================================
\echo ''
\echo '========================================='
\echo '1. CHECKING TABLES'
\echo '========================================='

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected: 8 tables
-- users, sessions, menu_items, orders, order_items, stock_adjustments, audit_logs, sync_metadata

-- ================================================
-- 2. CHECK INDEXES
-- ================================================
\echo ''
\echo '========================================='
\echo '2. CHECKING INDEXES'
\echo '========================================='

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes per table for performance

-- ================================================
-- 3. CHECK FOREIGN KEYS
-- ================================================
\echo ''
\echo '========================================='
\echo '3. CHECKING FOREIGN KEY CONSTRAINTS'
\echo '========================================='

SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Expected: Foreign keys connecting tables properly

-- ================================================
-- 4. CHECK TRIGGERS
-- ================================================
\echo ''
\echo '========================================='
\echo '4. CHECKING TRIGGERS'
\echo '========================================='

SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: Multiple triggers for updated_at, version increment, and audit logging

-- ================================================
-- 5. CHECK ROW LEVEL SECURITY
-- ================================================
\echo ''
\echo '========================================='
\echo '5. CHECKING ROW LEVEL SECURITY'
\echo '========================================='

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables should have rowsecurity = true

-- ================================================
-- 6. CHECK RLS POLICIES
-- ================================================
\echo ''
\echo '========================================='
\echo '6. CHECKING RLS POLICIES'
\echo '========================================='

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Policies for authenticated users on all tables

-- ================================================
-- 7. CHECK FUNCTIONS
-- ================================================
\echo ''
\echo '========================================='
\echo '7. CHECKING CUSTOM FUNCTIONS'
\echo '========================================='

SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  t.typname as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- Expected: update_updated_at_column, increment_version, audit functions, utility functions

-- ================================================
-- 8. CHECK VIEWS
-- ================================================
\echo ''
\echo '========================================='
\echo '8. CHECKING VIEWS'
\echo '========================================='

SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: session_sales_report, session_item_sales, stock_status, dashboard_metrics

-- ================================================
-- 9. CHECK EXTENSIONS
-- ================================================
\echo ''
\echo '========================================='
\echo '9. CHECKING EXTENSIONS'
\echo '========================================='

SELECT
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_stat_statements', 'pgcrypto');

-- Expected: uuid-ossp, pg_stat_statements

-- ================================================
-- 10. CHECK DATA INTEGRITY
-- ================================================
\echo ''
\echo '========================================='
\echo '10. CHECKING DATA INTEGRITY'
\echo '========================================='

-- Check for orphaned order_items
SELECT COUNT(*) as orphaned_order_items
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;
-- Expected: 0

-- Check for invalid stock levels
SELECT COUNT(*) as invalid_stock_levels
FROM menu_items
WHERE stock_level < 0;
-- Expected: 0

-- Check for invalid prices
SELECT COUNT(*) as invalid_prices
FROM menu_items
WHERE price < 0;
-- Expected: 0

-- Check for orders without items
SELECT COUNT(*) as orders_without_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE oi.id IS NULL;
-- Expected: Could be > 0 if orders exist (would be a data issue)

-- ================================================
-- 11. CHECK USERS
-- ================================================
\echo ''
\echo '========================================='
\echo '11. CHECKING USERS'
\echo '========================================='

SELECT
  username,
  role,
  created_at,
  updated_at
FROM users
ORDER BY created_at;

-- Expected: At least 1 admin user

-- ================================================
-- 12. PERFORMANCE CHECK
-- ================================================
\echo ''
\echo '========================================='
\echo '12. CHECKING TABLE STATISTICS'
\echo '========================================='

SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ================================================
-- SUMMARY
-- ================================================
\echo ''
\echo '========================================='
\echo 'VERIFICATION SUMMARY'
\echo '========================================='
\echo 'Expected Results:'
\echo '  - 8 tables created'
\echo '  - Multiple indexes per table'
\echo '  - Foreign keys properly configured'
\echo '  - Triggers for automation'
\echo '  - RLS enabled on all tables'
\echo '  - RLS policies configured'
\echo '  - Custom functions available'
\echo '  - Views for reporting'
\echo '  - Extensions enabled'
\echo '  - No data integrity issues'
\echo '  - Admin user exists'
\echo ''
\echo 'If any checks fail, review the migration files'
\echo 'and re-run the appropriate migration.'
\echo '========================================='
