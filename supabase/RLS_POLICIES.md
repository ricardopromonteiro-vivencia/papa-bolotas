# Row Level Security (RLS) Policies Documentation

## Overview

This document describes the Row Level Security (RLS) policies implemented for the Papa Bolotas webapp database. RLS policies ensure that authenticated users can only access and modify data they are authorized to see, providing defense-in-depth security.

## Requirements Addressed

- **Requirement 17.4**: Supabase_DB shall implement Row Level Security policies restricting access to authenticated users
- **Requirement 15.2**: POS_System shall protect against SQL injection through parameterized queries (RLS provides additional security layer)

## RLS Architecture

### Security Model

The Papa Bolotas webapp uses a single-tenant, role-based security model:

1. **Authentication**: Users authenticate through Supabase Auth
2. **Authorization**: RLS policies check `auth.role()` and `auth.uid()` 
3. **All users have 'admin' role**: Simplified security model for restaurant staff
4. **Row-level isolation**: Users can only access their own records where applicable

### Policy Types

| Policy Operation | Description | Use Case |
|-----------------|-------------|----------|
| SELECT | Controls read access | Viewing records |
| INSERT | Controls create access | Adding new records |
| UPDATE | Controls modify access | Editing existing records |
| DELETE | Controls remove access | Deleting records |
| ALL | Controls all operations | Simplified management |

## Table-by-Table RLS Policies

### 1. users Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Users can view own record | SELECT | `auth.uid() = id` | Users can only view their own user record |

**Security Characteristics**:
- ✅ Read isolation: Users can only see their own record
- ⚠️ No INSERT policy: User creation must be handled by admin or through special process
- ⚠️ No UPDATE policy: User modifications must be handled by admin
- ⚠️ No DELETE policy: User deletion must be handled by admin

**Test Scenarios**:
```sql
-- Test 1: User can view own record
-- Expected: Success
SELECT * FROM users WHERE id = auth.uid();

-- Test 2: User cannot view other users
-- Expected: Returns empty set
SELECT * FROM users WHERE id != auth.uid();
```

---

### 2. sessions Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can manage sessions | ALL | `auth.role() = 'authenticated'` | All authenticated users can create, read, update, delete sessions |

**Security Characteristics**:
- ✅ Authenticated access: Only logged-in users can access
- ✅ Full CRUD: Users can manage all session records
- ⚠️ No user isolation: All authenticated users can see all sessions
- ℹ️ Rationale: Restaurant staff need to view all sessions for reporting

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can create session
-- Expected: Success
INSERT INTO sessions (user_id, started_at, is_active) 
VALUES (auth.uid(), NOW(), true);

-- Test 2: Authenticated user can view all sessions
-- Expected: Success
SELECT * FROM sessions;

-- Test 3: Authenticated user can update session
-- Expected: Success
UPDATE sessions SET actual_cash = 150.00 WHERE id = 'session-id';

-- Test 4: Unauthenticated access denied
-- Expected: Failure (policy violation)
-- (Tested by attempting query without auth token)
```

---

### 3. menu_items Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can view menu items | SELECT | `auth.role() = 'authenticated'` | All authenticated users can view menu |
| Authenticated users can modify menu items | ALL | `auth.role() = 'authenticated'` | All authenticated users can manage menu |

**Security Characteristics**:
- ✅ Authenticated access required
- ✅ Full CRUD capabilities
- ✅ Separate policies for read vs write (granular control)
- ⚠️ No user isolation: All authenticated users can modify all items
- ℹ️ Rationale: Restaurant staff need shared menu management

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can view menu items
-- Expected: Success
SELECT * FROM menu_items WHERE is_active = true;

-- Test 2: Authenticated user can create menu item
-- Expected: Success
INSERT INTO menu_items (name, category, price, stock_level) 
VALUES ('Sandes de Leitão', 'Sandes', 5.50, 20);

-- Test 3: Authenticated user can update menu item
-- Expected: Success
UPDATE menu_items SET price = 6.00 WHERE id = 'item-id';

-- Test 4: Authenticated user can delete menu item
-- Expected: Success
DELETE FROM menu_items WHERE id = 'item-id';

-- Test 5: Unauthenticated access denied
-- Expected: Failure (policy violation)
-- (Tested by attempting query without auth token)
```

---

### 4. orders Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can manage orders | ALL | `auth.role() = 'authenticated'` | All authenticated users can manage orders |

**Security Characteristics**:
- ✅ Authenticated access required
- ✅ Full CRUD capabilities
- ⚠️ No user isolation: All authenticated users can see all orders
- ℹ️ Rationale: Staff need to view all orders for fulfillment and reporting

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can create order
-- Expected: Success
INSERT INTO orders (order_number, session_id, total, is_complimentary) 
VALUES (1, 'session-id', 15.50, false);

-- Test 2: Authenticated user can view all orders
-- Expected: Success
SELECT * FROM orders WHERE session_id = 'session-id';

-- Test 3: Authenticated user can cancel order
-- Expected: Success
UPDATE orders SET is_cancelled = true, cancelled_at = NOW(), cancelled_by = auth.uid() 
WHERE id = 'order-id';

-- Test 4: Unauthenticated access denied
-- Expected: Failure (policy violation)
```

---

### 5. order_items Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can manage order items | ALL | `auth.role() = 'authenticated'` | All authenticated users can manage order items |

**Security Characteristics**:
- ✅ Authenticated access required
- ✅ Full CRUD capabilities
- ✅ Cascade delete: Items deleted when parent order deleted
- ⚠️ No user isolation: All authenticated users can see all order items

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can add items to order
-- Expected: Success
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal, menu_item_name)
VALUES ('order-id', 'item-id', 2, 5.50, 11.00, 'Sandes de Leitão');

-- Test 2: Authenticated user can view order items
-- Expected: Success
SELECT * FROM order_items WHERE order_id = 'order-id';

-- Test 3: Cascade delete works
-- Expected: Success (order_items deleted when order deleted)
DELETE FROM orders WHERE id = 'order-id';
```

---

### 6. stock_adjustments Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can view adjustments | SELECT | `auth.role() = 'authenticated'` | All authenticated users can view stock history |
| Authenticated users can create adjustments | INSERT | `auth.role() = 'authenticated'` | All authenticated users can record adjustments |

**Security Characteristics**:
- ✅ Authenticated access required
- ✅ Audit trail protection: No UPDATE or DELETE policies
- ✅ Immutable records: Once created, adjustments cannot be modified
- ✅ Separate read/write policies for fine-grained control

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can view adjustments
-- Expected: Success
SELECT * FROM stock_adjustments WHERE menu_item_id = 'item-id';

-- Test 2: Authenticated user can create adjustment
-- Expected: Success
INSERT INTO stock_adjustments (menu_item_id, adjustment_type, quantity_change, previous_level, new_level, reason)
VALUES ('item-id', 'loss', -5, 20, 15, 'Breakage');

-- Test 3: Cannot update adjustment (no UPDATE policy)
-- Expected: Failure (policy violation)
UPDATE stock_adjustments SET quantity_change = -3 WHERE id = 'adj-id';

-- Test 4: Cannot delete adjustment (no DELETE policy)
-- Expected: Failure (policy violation)
DELETE FROM stock_adjustments WHERE id = 'adj-id';
```

---

### 7. audit_logs Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can view own logs | SELECT | `auth.uid() = user_id OR auth.role() = 'authenticated'` | Users can view their own logs OR any authenticated user can view all logs |

**Security Characteristics**:
- ✅ Authenticated access required
- ✅ Flexible access: Users can always see own logs, all auth users can see all logs
- ⚠️ No INSERT policy: Log creation must be handled by backend triggers/functions
- ⚠️ No UPDATE/DELETE policies: Logs are immutable

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can view own logs
-- Expected: Success
SELECT * FROM audit_logs WHERE user_id = auth.uid();

-- Test 2: Authenticated user can view all logs
-- Expected: Success
SELECT * FROM audit_logs;

-- Test 3: Cannot modify logs (no UPDATE policy)
-- Expected: Failure (policy violation)
UPDATE audit_logs SET action = 'modified' WHERE id = 'log-id';

-- Test 4: Cannot delete logs (no DELETE policy)
-- Expected: Failure (policy violation)
DELETE FROM audit_logs WHERE id = 'log-id';
```

---

### 8. sync_metadata Table

**RLS Status**: ✅ ENABLED

**Policies**:

| Policy Name | Operation | Rule | Purpose |
|------------|-----------|------|---------|
| Authenticated users can manage sync metadata | ALL | `auth.role() = 'authenticated'` | All authenticated users can manage sync state |

**Security Characteristics**:
- ✅ Authenticated access required
- ✅ Full CRUD capabilities
- ⚠️ No client isolation: All authenticated users can see all sync metadata
- ℹ️ Rationale: Sync engine needs to manage metadata across devices

**Test Scenarios**:
```sql
-- Test 1: Authenticated user can create sync metadata
-- Expected: Success
INSERT INTO sync_metadata (entity_type, entity_id, client_id, sync_status, version)
VALUES ('orders', 'order-id', 'device-id', 'pending', 1);

-- Test 2: Authenticated user can update sync status
-- Expected: Success
UPDATE sync_metadata SET sync_status = 'synced', last_synced_at = NOW() 
WHERE entity_id = 'order-id' AND client_id = 'device-id';

-- Test 3: Authenticated user can view sync metadata
-- Expected: Success
SELECT * FROM sync_metadata WHERE sync_status = 'pending';
```

---

## Testing Strategy

### Manual Testing Procedure

#### Prerequisites
1. Supabase project configured with migrations applied
2. Test user account created
3. Valid authentication token

#### Test Execution Steps

**Step 1: Setup Test Environment**
```bash
# Navigate to supabase directory
cd supabase

# Apply migrations to test database
supabase db reset

# Create test user
psql <connection-string> -c "INSERT INTO users (username, password_hash, role) VALUES ('testuser', '<hashed-password>', 'admin');"
```

**Step 2: Authenticate Test User**
```javascript
// Using Supabase client
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'testuser@test.com',
  password: 'testpassword'
});
```

**Step 3: Run Policy Tests**
For each table, execute the test scenarios documented above through:
- Supabase SQL Editor
- Supabase JavaScript client
- Direct PostgreSQL connection with JWT token

**Step 4: Verify Results**
- ✅ Authenticated operations should succeed
- ❌ Unauthenticated operations should fail with policy violation
- ❌ Unauthorized operations should return empty results or fail

### Automated Testing

Create integration tests using Vitest and Supabase test client:

```typescript
// tests/rls-policies.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  let authClient: SupabaseClient;
  let unauthClient: SupabaseClient;

  beforeEach(async () => {
    // Setup authenticated client
    authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await authClient.auth.signInWithPassword({
      email: 'test@test.com',
      password: 'password'
    });

    // Setup unauthenticated client
    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('menu_items table', () => {
    it('authenticated user can view menu items', async () => {
      const { data, error } = await authClient
        .from('menu_items')
        .select('*');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('unauthenticated user cannot view menu items', async () => {
      const { data, error } = await unauthClient
        .from('menu_items')
        .select('*');
      
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('authenticated user can create menu item', async () => {
      const { data, error } = await authClient
        .from('menu_items')
        .insert({
          name: 'Test Item',
          category: 'Sandes',
          price: 5.00,
          stock_level: 10
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Item');
    });
  });

  describe('orders table', () => {
    it('authenticated user can create order', async () => {
      // Create session first
      const { data: session } = await authClient
        .from('sessions')
        .insert({ user_id: authClient.auth.user()?.id })
        .select()
        .single();

      const { data, error } = await authClient
        .from('orders')
        .insert({
          order_number: 1,
          session_id: session.id,
          total: 10.50
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('stock_adjustments table', () => {
    it('authenticated user cannot update adjustment', async () => {
      // Create adjustment
      const { data: adjustment } = await authClient
        .from('stock_adjustments')
        .insert({
          menu_item_id: 'item-id',
          adjustment_type: 'loss',
          quantity_change: -5,
          previous_level: 20,
          new_level: 15
        })
        .select()
        .single();

      // Attempt to update (should fail - no UPDATE policy)
      const { error } = await authClient
        .from('stock_adjustments')
        .update({ quantity_change: -3 })
        .eq('id', adjustment.id);
      
      expect(error).toBeDefined();
      expect(error.message).toContain('policy');
    });
  });
});
```

## Security Best Practices

### ✅ Implemented

1. **RLS Enabled on All Tables**: Every table has RLS enabled, preventing unauthorized access
2. **Authentication Required**: All policies require authenticated users
3. **Immutable Audit Trails**: `audit_logs` and `stock_adjustments` cannot be modified after creation
4. **Parameterized Queries**: Supabase client uses prepared statements automatically
5. **Defense in Depth**: RLS provides additional security layer beyond application logic

### ⚠️ Considerations

1. **No Row-Level User Isolation**: Current model allows all authenticated users to see all data
   - **Rationale**: Restaurant staff need shared access for operations
   - **Alternative**: Could implement user-specific filters for sensitive operations

2. **Admin Operations**: Some tables have no INSERT/UPDATE/DELETE policies for security
   - **users table**: User management requires special handling
   - **audit_logs table**: Logs created by triggers, not direct inserts

3. **Client-Side Filtering**: Application layer should implement additional business logic
   - RLS ensures security baseline
   - Application enforces workflow rules

### 🔐 Security Recommendations

1. **Monitor Failed Policy Violations**: Set up alerts for RLS policy failures
2. **Regular Policy Audits**: Review policies quarterly for security gaps
3. **Principle of Least Privilege**: Evaluate if more restrictive policies are needed as app grows
4. **API Key Rotation**: Regularly rotate Supabase API keys
5. **Rate Limiting**: Implement rate limiting on authentication endpoints

## Verification Checklist

- [x] All tables have RLS enabled
- [x] Authenticated access required for all operations
- [x] Read policies allow viewing data
- [x] Write policies allow creating/modifying data
- [x] Audit trails are immutable
- [x] Unauthenticated access is blocked
- [x] Policies align with requirements 17.4 and 15.2
- [x] Documentation complete for all tables
- [x] Test scenarios defined for each policy

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Requirement 17.4: Database Configuration
- Requirement 15.2: Security Protection
