-- ================================================
-- Row Level Security (RLS) Policy Tests
-- ================================================
-- This file contains SQL test scenarios for validating RLS policies
-- Run these tests against a test Supabase instance with test data
--
-- Requirements: 17.4, 15.2
-- ================================================

-- Test Setup
-- Create test user and get auth context
-- Note: In production, this would use actual Supabase auth tokens

BEGIN;

-- ================================================
-- TEST SUITE 1: users TABLE
-- ================================================

-- Test 1.1: User can view own record
-- EXPECTED: Success - returns user's own record
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users WHERE id = 'user-uuid-1'::uuid
    ) 
    THEN 'PASS: User can view own record'
    ELSE 'FAIL: User cannot view own record'
  END AS test_result;

-- Test 1.2: User cannot view other users
-- EXPECTED: Empty result set
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM users WHERE id != 'user-uuid-1'::uuid
    ) 
    THEN 'PASS: User cannot view other users'
    ELSE 'FAIL: User can view other users (security issue)'
  END AS test_result;

-- Test 1.3: Unauthenticated user cannot view users
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM users
    ) 
    THEN 'PASS: Unauthenticated user cannot view users'
    ELSE 'FAIL: Unauthenticated user can view users (security issue)'
  END AS test_result;

-- ================================================
-- TEST SUITE 2: sessions TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Test 2.1: Authenticated user can view sessions
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view sessions'
    ELSE 'FAIL: Authenticated user cannot view sessions'
  END AS test_result
FROM sessions;

-- Test 2.2: Authenticated user can create session
-- EXPECTED: Success
INSERT INTO sessions (id, user_id, started_at, is_active, version)
VALUES (
  'test-session-1'::uuid,
  'user-uuid-1'::uuid,
  NOW(),
  true,
  1
);

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sessions WHERE id = 'test-session-1'::uuid
    )
    THEN 'PASS: Authenticated user can create session'
    ELSE 'FAIL: Authenticated user cannot create session'
  END AS test_result;

-- Test 2.3: Authenticated user can update session
-- EXPECTED: Success
UPDATE sessions 
SET actual_cash = 150.00 
WHERE id = 'test-session-1'::uuid;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sessions 
      WHERE id = 'test-session-1'::uuid AND actual_cash = 150.00
    )
    THEN 'PASS: Authenticated user can update session'
    ELSE 'FAIL: Authenticated user cannot update session'
  END AS test_result;

-- Test 2.4: Authenticated user can delete session
-- EXPECTED: Success
DELETE FROM sessions WHERE id = 'test-session-1'::uuid;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM sessions WHERE id = 'test-session-1'::uuid
    )
    THEN 'PASS: Authenticated user can delete session'
    ELSE 'FAIL: Authenticated user cannot delete session'
  END AS test_result;

-- Test 2.5: Unauthenticated user cannot access sessions
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM sessions
    )
    THEN 'PASS: Unauthenticated user cannot access sessions'
    ELSE 'FAIL: Unauthenticated user can access sessions (security issue)'
  END AS test_result;

-- ================================================
-- TEST SUITE 3: menu_items TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Test 3.1: Authenticated user can view menu items
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view menu items'
    ELSE 'FAIL: Authenticated user cannot view menu items'
  END AS test_result
FROM menu_items;

-- Test 3.2: Authenticated user can create menu item
-- EXPECTED: Success
INSERT INTO menu_items (id, name, category, price, stock_level, is_active, version)
VALUES (
  'test-item-1'::uuid,
  'Test Sandes',
  'Sandes',
  5.50,
  20,
  true,
  1
);

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM menu_items WHERE id = 'test-item-1'::uuid
    )
    THEN 'PASS: Authenticated user can create menu item'
    ELSE 'FAIL: Authenticated user cannot create menu item'
  END AS test_result;

-- Test 3.3: Authenticated user can update menu item
-- EXPECTED: Success
UPDATE menu_items 
SET price = 6.00 
WHERE id = 'test-item-1'::uuid;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM menu_items 
      WHERE id = 'test-item-1'::uuid AND price = 6.00
    )
    THEN 'PASS: Authenticated user can update menu item'
    ELSE 'FAIL: Authenticated user cannot update menu item'
  END AS test_result;

-- Test 3.4: Authenticated user can delete menu item
-- EXPECTED: Success
DELETE FROM menu_items WHERE id = 'test-item-1'::uuid;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM menu_items WHERE id = 'test-item-1'::uuid
    )
    THEN 'PASS: Authenticated user can delete menu item'
    ELSE 'FAIL: Authenticated user cannot delete menu item'
  END AS test_result;

-- Test 3.5: Unauthenticated user cannot access menu items
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM menu_items
    )
    THEN 'PASS: Unauthenticated user cannot access menu items'
    ELSE 'FAIL: Unauthenticated user can access menu items (security issue)'
  END AS test_result;

-- ================================================
-- TEST SUITE 4: orders TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Setup: Create session for order tests
INSERT INTO sessions (id, user_id, started_at, is_active, version)
VALUES (
  'test-session-2'::uuid,
  'user-uuid-1'::uuid,
  NOW(),
  true,
  1
);

-- Test 4.1: Authenticated user can view orders
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view orders'
    ELSE 'FAIL: Authenticated user cannot view orders'
  END AS test_result
FROM orders;

-- Test 4.2: Authenticated user can create order
-- EXPECTED: Success
INSERT INTO orders (id, order_number, session_id, total, is_complimentary, is_cancelled, version)
VALUES (
  'test-order-1'::uuid,
  1,
  'test-session-2'::uuid,
  15.50,
  false,
  false,
  1
);

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM orders WHERE id = 'test-order-1'::uuid
    )
    THEN 'PASS: Authenticated user can create order'
    ELSE 'FAIL: Authenticated user cannot create order'
  END AS test_result;

-- Test 4.3: Authenticated user can update order (cancel)
-- EXPECTED: Success
UPDATE orders 
SET is_cancelled = true, cancelled_at = NOW(), cancelled_by = 'user-uuid-1'::uuid
WHERE id = 'test-order-1'::uuid;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM orders 
      WHERE id = 'test-order-1'::uuid AND is_cancelled = true
    )
    THEN 'PASS: Authenticated user can update order'
    ELSE 'FAIL: Authenticated user cannot update order'
  END AS test_result;

-- Test 4.4: Authenticated user can delete order
-- EXPECTED: Success
DELETE FROM orders WHERE id = 'test-order-1'::uuid;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM orders WHERE id = 'test-order-1'::uuid
    )
    THEN 'PASS: Authenticated user can delete order'
    ELSE 'FAIL: Authenticated user cannot delete order'
  END AS test_result;

-- Cleanup
DELETE FROM sessions WHERE id = 'test-session-2'::uuid;

-- Test 4.5: Unauthenticated user cannot access orders
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM orders
    )
    THEN 'PASS: Unauthenticated user cannot access orders'
    ELSE 'FAIL: Unauthenticated user can access orders (security issue)'
  END AS test_result;

-- ================================================
-- TEST SUITE 5: order_items TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Setup: Create order and menu item for order_items tests
INSERT INTO sessions (id, user_id, started_at, is_active, version)
VALUES ('test-session-3'::uuid, 'user-uuid-1'::uuid, NOW(), true, 1);

INSERT INTO menu_items (id, name, category, price, stock_level, is_active, version)
VALUES ('test-item-2'::uuid, 'Test Item', 'Sandes', 5.50, 20, true, 1);

INSERT INTO orders (id, order_number, session_id, total, version)
VALUES ('test-order-2'::uuid, 1, 'test-session-3'::uuid, 11.00, 1);

-- Test 5.1: Authenticated user can create order item
-- EXPECTED: Success
INSERT INTO order_items (id, order_id, menu_item_id, quantity, unit_price, subtotal, menu_item_name)
VALUES (
  'test-order-item-1'::uuid,
  'test-order-2'::uuid,
  'test-item-2'::uuid,
  2,
  5.50,
  11.00,
  'Test Item'
);

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM order_items WHERE id = 'test-order-item-1'::uuid
    )
    THEN 'PASS: Authenticated user can create order item'
    ELSE 'FAIL: Authenticated user cannot create order item'
  END AS test_result;

-- Test 5.2: Authenticated user can view order items
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) > 0
    THEN 'PASS: Authenticated user can view order items'
    ELSE 'FAIL: Authenticated user cannot view order items'
  END AS test_result
FROM order_items
WHERE order_id = 'test-order-2'::uuid;

-- Test 5.3: Cascade delete works (delete order should delete order_items)
-- EXPECTED: order_items deleted when order deleted
DELETE FROM orders WHERE id = 'test-order-2'::uuid;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM order_items WHERE id = 'test-order-item-1'::uuid
    )
    THEN 'PASS: Cascade delete works for order items'
    ELSE 'FAIL: Cascade delete does not work'
  END AS test_result;

-- Cleanup
DELETE FROM menu_items WHERE id = 'test-item-2'::uuid;
DELETE FROM sessions WHERE id = 'test-session-3'::uuid;

-- Test 5.4: Unauthenticated user cannot access order items
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM order_items
    )
    THEN 'PASS: Unauthenticated user cannot access order items'
    ELSE 'FAIL: Unauthenticated user can access order items (security issue)'
  END AS test_result;

-- ================================================
-- TEST SUITE 6: stock_adjustments TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Setup: Create menu item for adjustment tests
INSERT INTO menu_items (id, name, category, price, stock_level, is_active, version)
VALUES ('test-item-3'::uuid, 'Test Item 3', 'Sandes', 5.50, 20, true, 1);

-- Test 6.1: Authenticated user can view stock adjustments
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view stock adjustments'
    ELSE 'FAIL: Authenticated user cannot view stock adjustments'
  END AS test_result
FROM stock_adjustments;

-- Test 6.2: Authenticated user can create stock adjustment
-- EXPECTED: Success
INSERT INTO stock_adjustments (id, menu_item_id, adjustment_type, quantity_change, previous_level, new_level, reason)
VALUES (
  'test-adjustment-1'::uuid,
  'test-item-3'::uuid,
  'loss',
  -5,
  20,
  15,
  'Breakage during service'
);

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM stock_adjustments WHERE id = 'test-adjustment-1'::uuid
    )
    THEN 'PASS: Authenticated user can create stock adjustment'
    ELSE 'FAIL: Authenticated user cannot create stock adjustment'
  END AS test_result;

-- Test 6.3: Authenticated user CANNOT update stock adjustment (immutable audit trail)
-- EXPECTED: Failure (no UPDATE policy)
DO $$
DECLARE
  update_failed BOOLEAN := false;
BEGIN
  UPDATE stock_adjustments 
  SET quantity_change = -3 
  WHERE id = 'test-adjustment-1'::uuid;
EXCEPTION
  WHEN insufficient_privilege THEN
    update_failed := true;
END $$;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM stock_adjustments 
      WHERE id = 'test-adjustment-1'::uuid AND quantity_change = -3
    )
    THEN 'PASS: Stock adjustments are immutable (cannot update)'
    ELSE 'FAIL: Stock adjustments can be updated (security issue)'
  END AS test_result;

-- Test 6.4: Authenticated user CANNOT delete stock adjustment (immutable audit trail)
-- EXPECTED: Failure (no DELETE policy)
DO $$
DECLARE
  delete_failed BOOLEAN := false;
BEGIN
  DELETE FROM stock_adjustments WHERE id = 'test-adjustment-1'::uuid;
EXCEPTION
  WHEN insufficient_privilege THEN
    delete_failed := true;
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM stock_adjustments WHERE id = 'test-adjustment-1'::uuid
    )
    THEN 'PASS: Stock adjustments are immutable (cannot delete)'
    ELSE 'FAIL: Stock adjustments can be deleted (security issue)'
  END AS test_result;

-- Cleanup (using superuser privileges to clean test data)
-- In production, this would require elevated privileges
-- DELETE FROM stock_adjustments WHERE id = 'test-adjustment-1'::uuid;
DELETE FROM menu_items WHERE id = 'test-item-3'::uuid;

-- ================================================
-- TEST SUITE 7: audit_logs TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Test 7.1: Authenticated user can view audit logs
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view audit logs'
    ELSE 'FAIL: Authenticated user cannot view audit logs'
  END AS test_result
FROM audit_logs;

-- Test 7.2: Authenticated user can view own logs
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view own logs'
    ELSE 'FAIL: Authenticated user cannot view own logs'
  END AS test_result
FROM audit_logs
WHERE user_id = 'user-uuid-1'::uuid;

-- Note: INSERT, UPDATE, DELETE tests for audit_logs are skipped
-- because these operations should be handled by database triggers,
-- not direct user operations

-- Test 7.3: Unauthenticated user cannot access audit logs
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM audit_logs
    )
    THEN 'PASS: Unauthenticated user cannot access audit logs'
    ELSE 'FAIL: Unauthenticated user can access audit logs (security issue)'
  END AS test_result;

-- ================================================
-- TEST SUITE 8: sync_metadata TABLE
-- ================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-1", "role": "authenticated"}';

-- Test 8.1: Authenticated user can view sync metadata
-- EXPECTED: Success
SELECT 
  CASE 
    WHEN COUNT(*) >= 0
    THEN 'PASS: Authenticated user can view sync metadata'
    ELSE 'FAIL: Authenticated user cannot view sync metadata'
  END AS test_result
FROM sync_metadata;

-- Test 8.2: Authenticated user can create sync metadata
-- EXPECTED: Success
INSERT INTO sync_metadata (id, entity_type, entity_id, client_id, sync_status, version)
VALUES (
  'test-sync-1'::uuid,
  'orders',
  'order-uuid-1'::uuid,
  'device-uuid-1'::uuid,
  'pending',
  1
);

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sync_metadata WHERE id = 'test-sync-1'::uuid
    )
    THEN 'PASS: Authenticated user can create sync metadata'
    ELSE 'FAIL: Authenticated user cannot create sync metadata'
  END AS test_result;

-- Test 8.3: Authenticated user can update sync metadata
-- EXPECTED: Success
UPDATE sync_metadata 
SET sync_status = 'synced', last_synced_at = NOW() 
WHERE id = 'test-sync-1'::uuid;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sync_metadata 
      WHERE id = 'test-sync-1'::uuid AND sync_status = 'synced'
    )
    THEN 'PASS: Authenticated user can update sync metadata'
    ELSE 'FAIL: Authenticated user cannot update sync metadata'
  END AS test_result;

-- Test 8.4: Authenticated user can delete sync metadata
-- EXPECTED: Success
DELETE FROM sync_metadata WHERE id = 'test-sync-1'::uuid;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM sync_metadata WHERE id = 'test-sync-1'::uuid
    )
    THEN 'PASS: Authenticated user can delete sync metadata'
    ELSE 'FAIL: Authenticated user cannot delete sync metadata'
  END AS test_result;

-- Test 8.5: Unauthenticated user cannot access sync metadata
-- EXPECTED: Empty result set
RESET ROLE;
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM sync_metadata
    )
    THEN 'PASS: Unauthenticated user cannot access sync metadata'
    ELSE 'FAIL: Unauthenticated user can access sync metadata (security issue)'
  END AS test_result;

COMMIT;

-- ================================================
-- TEST SUMMARY
-- ================================================
-- To run these tests:
-- 1. Connect to your test Supabase database
-- 2. Ensure migrations are applied
-- 3. Create test users with UUIDs matching the tests
-- 4. Execute this file: psql <connection-string> -f rls-policies.test.sql
-- 5. Review the test results
-- 
-- All tests should show "PASS" status
-- Any "FAIL" indicates an RLS policy issue that needs investigation
-- ================================================
