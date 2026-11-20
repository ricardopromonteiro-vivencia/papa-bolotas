# RLS Testing Guide

## Overview

This guide provides step-by-step instructions for testing Row Level Security (RLS) policies in the Papa Bolotas webapp. RLS policies ensure data security by restricting database access at the row level based on user authentication and authorization.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- PostgreSQL client (psql) or Supabase Studio access
- Node.js and npm for JavaScript tests
- Test Supabase project configured

## Testing Approaches

### 1. SQL-Based Testing (Manual)

**Location**: `supabase/tests/rls-policies.test.sql`

**When to Use**: 
- During database migration development
- To verify policy logic directly at the database level
- For debugging specific policy issues

**How to Run**:

```bash
# Option A: Using Supabase CLI
cd supabase
supabase db reset  # Apply all migrations
psql <your-connection-string> -f tests/rls-policies.test.sql

# Option B: Using Supabase Studio
# 1. Open Supabase Studio SQL Editor
# 2. Copy contents of rls-policies.test.sql
# 3. Execute the script
# 4. Review test results in output
```

**Expected Output**:
Each test will output either:
- ✅ `PASS: <test description>` - Policy working correctly
- ❌ `FAIL: <test description>` - Policy violation or error

**Example Output**:
```
test_result
---------------------------------------------
PASS: User can view own record
PASS: User cannot view other users
PASS: Unauthenticated user cannot view users
PASS: Authenticated user can view sessions
PASS: Authenticated user can create session
...
```

### 2. JavaScript/TypeScript Integration Testing (Automated)

**Location**: `supabase/tests/rls-policies.integration.test.ts`

**When to Use**:
- During CI/CD pipeline
- For regression testing
- To test real-world client scenarios

**Setup**:

1. **Install Dependencies**:
```bash
cd webapp
npm install @supabase/supabase-js --save-dev
npm install vitest --save-dev
```

2. **Configure Test Environment**:
Create `.env.test` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. **Create Test User**:
```bash
# Using Supabase Studio or CLI
# Navigate to Authentication > Users > Add User
# Email: test@papabolotas.com
# Password: TestPassword123!
```

**How to Run**:

```bash
cd webapp

# Run all RLS tests
npm test -- rls-policies.integration.test.ts

# Run with coverage
npm test -- --coverage rls-policies.integration.test.ts

# Run in watch mode
npm test -- --watch rls-policies.integration.test.ts

# Run specific test suite
npm test -- rls-policies.integration.test.ts -t "menu_items table"
```

**Expected Output**:
```
✓ users table (4)
  ✓ authenticated user can view own record
  ✓ authenticated user cannot view other users
  ✓ unauthenticated user cannot view users
✓ sessions table (4)
  ✓ authenticated user can create session
  ✓ authenticated user can view all sessions
  ✓ authenticated user can update session
  ✓ unauthenticated user cannot access sessions
✓ menu_items table (5)
  ...

Test Files  1 passed (1)
     Tests  40 passed (40)
  Start at  14:30:15
  Duration  2.35s
```

### 3. Manual Testing via Supabase Studio

**When to Use**:
- Quick verification during development
- Exploring edge cases
- Visual confirmation of policy behavior

**Steps**:

1. **Open Supabase Studio**:
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Test Authenticated Access**:
   ```sql
   -- In SQL Editor, enable RLS context
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claims TO '{"sub": "your-user-id", "role": "authenticated"}';
   
   -- Test query
   SELECT * FROM menu_items;
   ```

3. **Test Unauthenticated Access**:
   ```sql
   -- Reset role
   RESET ROLE;
   
   -- This should return empty or error
   SELECT * FROM menu_items;
   ```

4. **Verify Policy Enforcement**:
   - Navigate to Table Editor
   - Try to insert/update/delete records
   - Verify operations succeed/fail as expected

## Test Scenarios by Table

### users Table

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| Authenticated user views own record | ✅ Success | User sees their own data |
| Authenticated user views other users | ❌ Empty result | No rows returned |
| Unauthenticated access | ❌ Denied | No rows returned |
| User modification without admin | ❌ Denied | Policy violation error |

### sessions Table

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| Create session | ✅ Success | Record created |
| View all sessions | ✅ Success | All records visible |
| Update session | ✅ Success | Record updated |
| Delete session | ✅ Success | Record deleted |
| Unauthenticated access | ❌ Denied | No rows returned |

### menu_items Table

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| View menu items | ✅ Success | All records visible |
| Create menu item | ✅ Success | Record created |
| Update menu item price | ✅ Success | Price updated |
| Delete menu item | ✅ Success | Record deleted |
| Unauthenticated access | ❌ Denied | No rows returned |

### orders Table

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| Create order | ✅ Success | Record created with session |
| View all orders | ✅ Success | All records visible |
| Cancel order | ✅ Success | is_cancelled = true |
| Delete order | ✅ Success | Record deleted |
| Unauthenticated access | ❌ Denied | No rows returned |

### order_items Table

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| Add items to order | ✅ Success | Items created |
| View order items | ✅ Success | Items visible |
| Cascade delete | ✅ Success | Items deleted with order |
| Unauthenticated access | ❌ Denied | No rows returned |

### stock_adjustments Table (Immutable)

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| View adjustments | ✅ Success | All records visible |
| Create adjustment | ✅ Success | Record created |
| Update adjustment | ❌ Denied | No UPDATE policy |
| Delete adjustment | ❌ Denied | No DELETE policy |
| Unauthenticated access | ❌ Denied | No rows returned |

### audit_logs Table (Read-Only for Users)

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| View all logs | ✅ Success | All records visible |
| View own logs | ✅ Success | User's logs visible |
| Create log (direct) | ❌ Denied | No INSERT policy |
| Update log | ❌ Denied | No UPDATE policy |
| Delete log | ❌ Denied | No DELETE policy |
| Unauthenticated access | ❌ Denied | No rows returned |

### sync_metadata Table

| Test Scenario | Expected Result | Validation Method |
|--------------|----------------|-------------------|
| View sync metadata | ✅ Success | All records visible |
| Create metadata | ✅ Success | Record created |
| Update sync status | ✅ Success | Status updated |
| Delete metadata | ✅ Success | Record deleted |
| Unauthenticated access | ❌ Denied | No rows returned |

## Common Issues and Troubleshooting

### Issue 1: All Tests Fail with "permission denied"

**Cause**: RLS not enabled on tables or policies not created

**Solution**:
```bash
# Reapply migrations
cd supabase
supabase db reset
```

### Issue 2: Authenticated Tests Fail

**Cause**: Invalid authentication token or expired session

**Solution**:
```javascript
// Refresh authentication
const { data } = await supabase.auth.refreshSession();
```

### Issue 3: Policies Too Restrictive

**Cause**: Policy logic error or missing policy

**Solution**:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Verify policy expression
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'your_table'::regclass;
```

### Issue 4: Cascade Delete Not Working

**Cause**: RLS policy blocks cascade operation

**Solution**: Ensure child table has appropriate DELETE policy
```sql
-- order_items should have policy allowing deletion
CREATE POLICY "Authenticated users can manage order items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');
```

## Performance Testing

### Load Testing RLS Policies

Create a load test script to ensure RLS policies don't significantly impact performance:

```typescript
// load-test-rls.ts
import { createClient } from '@supabase/supabase-js';

async function loadTest() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signInWithPassword({...});

  const iterations = 1000;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await client.from('menu_items').select('*');
  }

  const duration = Date.now() - startTime;
  console.log(`${iterations} queries in ${duration}ms`);
  console.log(`Average: ${duration / iterations}ms per query`);
}

loadTest();
```

**Expected Performance**:
- Simple SELECT with RLS: < 10ms per query
- INSERT with RLS: < 20ms per query
- Complex joins with RLS: < 50ms per query

## CI/CD Integration

### GitHub Actions Example

```yaml
name: RLS Policy Tests

on: [push, pull_request]

jobs:
  test-rls:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd webapp
          npm ci
      
      - name: Apply Supabase migrations
        run: |
          cd supabase
          npx supabase db reset
      
      - name: Run RLS integration tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          cd webapp
          npm test -- rls-policies.integration.test.ts
```

## Security Audit Checklist

Before deploying to production, verify:

- [ ] All tables have RLS enabled
- [ ] All policies require authentication
- [ ] Unauthenticated access is blocked on all tables
- [ ] Audit trails (audit_logs, stock_adjustments) are immutable
- [ ] Users can only see their own sensitive data
- [ ] All tests pass in CI/CD pipeline
- [ ] Performance impact of RLS is acceptable (< 50ms overhead)
- [ ] Edge cases are covered (concurrent updates, cascade deletes)
- [ ] Documentation is up-to-date
- [ ] Security team has reviewed policies

## Maintenance

### Regular Checks (Monthly)

1. Review failed authentication attempts in audit logs
2. Check for policy violations in logs
3. Verify test coverage remains above 90%
4. Update tests for new features/tables
5. Review and update this documentation

### When to Update RLS Policies

- Adding new tables
- Changing data access patterns
- Adding new user roles
- Implementing multi-tenancy
- Security audit findings
- Performance optimization needs

## References

- [RLS Policies Documentation](./RLS_POLICIES.md)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Requirements 17.4 (Database Configuration)
- Requirements 15.2 (Security Protection)

## Support

For issues or questions:
1. Check this guide first
2. Review RLS_POLICIES.md for policy details
3. Check Supabase documentation
4. Contact development team
