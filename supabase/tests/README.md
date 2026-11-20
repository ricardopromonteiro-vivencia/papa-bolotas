# Supabase RLS Policy Tests

## Overview

This directory contains test suites for validating Row Level Security (RLS) policies in the Papa Bolotas webapp database.

## Test Files

### 1. `rls-policies.test.sql`
**Type**: SQL-based manual/automated tests  
**Purpose**: Direct database testing of RLS policies  
**Language**: PostgreSQL SQL

**Usage**:
```bash
# Using psql
psql <connection-string> -f rls-policies.test.sql

# Using Supabase CLI
supabase db reset
psql $(supabase status -o postgres_url) -f rls-policies.test.sql
```

**When to Use**:
- During database migration development
- Debugging specific policy issues
- Quick manual verification

---

### 2. `rls-policies.integration.test.ts`
**Type**: JavaScript/TypeScript integration tests  
**Purpose**: Testing RLS through Supabase client (real-world usage)  
**Framework**: Vitest

**Usage**:
```bash
cd ../webapp
npm test -- rls-policies.integration.test.ts
```

**When to Use**:
- CI/CD pipeline integration
- Automated regression testing
- Testing client-side behavior

---

## Test Coverage

| Table | SQL Tests | Integration Tests | Status |
|-------|-----------|------------------|--------|
| users | ✅ | ✅ | Complete |
| sessions | ✅ | ✅ | Complete |
| menu_items | ✅ | ✅ | Complete |
| orders | ✅ | ✅ | Complete |
| order_items | ✅ | ✅ | Complete |
| stock_adjustments | ✅ | ✅ | Complete |
| audit_logs | ✅ | ✅ | Complete |
| sync_metadata | ✅ | ✅ | Complete |

## Quick Start

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Install test dependencies
cd ../webapp
npm install
```

### Running Tests

**Option 1: SQL Tests (Quick)**
```bash
cd supabase
supabase db reset  # Apply migrations
psql <connection-string> -f tests/rls-policies.test.sql
```

**Option 2: Integration Tests (Comprehensive)**
```bash
cd webapp

# Create .env.test
echo "VITE_SUPABASE_URL=your-url" > .env.test
echo "VITE_SUPABASE_ANON_KEY=your-key" >> .env.test

# Run tests
npm test -- rls-policies.integration.test.ts
```

## Test Scenarios

### Authentication Tests
- ✅ Authenticated users can access permitted tables
- ✅ Unauthenticated users are blocked from all tables
- ✅ Invalid/expired tokens are rejected

### Authorization Tests
- ✅ Users can only view their own user record
- ✅ Authenticated users can access shared data (orders, menu, etc.)
- ✅ Immutable tables cannot be modified

### CRUD Tests
- ✅ CREATE operations work where policies allow
- ✅ READ operations return correct data
- ✅ UPDATE operations work where policies allow
- ✅ DELETE operations work where policies allow

### Edge Cases
- ✅ Cascade deletes work within RLS
- ✅ Foreign key constraints enforced
- ✅ Concurrent updates handled correctly

## Continuous Integration

### GitHub Actions Example

```yaml
name: RLS Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Run RLS Tests
        run: |
          cd webapp
          npm ci
          npm test -- rls-policies.integration.test.ts
```

## Troubleshooting

### Issue: "permission denied for table"
**Solution**: RLS not enabled or policies missing
```bash
cd supabase
supabase db reset  # Reapply migrations
```

### Issue: "JWT expired"
**Solution**: Refresh authentication token
```typescript
await supabase.auth.refreshSession();
```

### Issue: Tests pass locally but fail in CI
**Solution**: Check environment variables
```bash
# Verify .env.test is configured correctly
cat .env.test
```

## Documentation

For detailed information:
- [RLS Policies Documentation](../RLS_POLICIES.md)
- [RLS Testing Guide](../RLS_TESTING_GUIDE.md)
- [RLS Verification Report](../RLS_VERIFICATION_REPORT.md)

## Requirements

These tests validate:
- **Requirement 17.4**: Row Level Security policies restricting access to authenticated users
- **Requirement 15.2**: Security protection against SQL injection

## Maintenance

### Adding Tests for New Tables

1. **Add SQL tests** in `rls-policies.test.sql`:
```sql
-- TEST SUITE: new_table
SET LOCAL ROLE authenticated;
-- Add test scenarios
```

2. **Add integration tests** in `rls-policies.integration.test.ts`:
```typescript
describe('new_table', () => {
  it('authenticated user can access', async () => {
    // Add test logic
  });
});
```

3. **Update documentation** in `../RLS_POLICIES.md`

### Regular Maintenance
- Run tests before each deployment
- Review failed tests immediately
- Update tests when policies change
- Keep documentation in sync

## Support

For issues or questions:
1. Check [RLS Testing Guide](../RLS_TESTING_GUIDE.md)
2. Review [RLS Policies Documentation](../RLS_POLICIES.md)
3. Check Supabase logs in dashboard
4. Contact development team
