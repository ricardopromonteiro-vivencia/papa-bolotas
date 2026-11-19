# Database Layer Documentation

## Overview

The Papa Bolotas webapp uses **Dexie.js** as a wrapper around IndexedDB for local data persistence. This provides an offline-first architecture where all data is stored locally and synchronized with Supabase when online.

## Database Schema

### Tables

The database mirrors the Supabase PostgreSQL schema with the following tables:

- **users**: System users (admin accounts)
- **menuItems**: Products available for sale
- **orders**: Customer orders
- **orderItems**: Individual items within orders
- **sessions**: Work sessions from login to cash register closure
- **stockAdjustments**: Audit trail of stock changes
- **auditLogs**: System activity logs
- **syncQueue**: Pending changes awaiting synchronization

### Schema Version

Current version: **v1**

The schema is versioned to support future migrations. Dexie automatically handles schema upgrades when the version number is incremented.

## Usage

### Importing the Database

```typescript
import { db } from '@/lib/db';
```

The `db` instance is a singleton that's automatically initialized when the module loads.

### Basic Operations

#### Adding Records

```typescript
// Add a single menu item
await db.menuItems.add({
  id: 'item-1',
  name: 'Sandes de Leitão',
  category: Category.SANDES,
  price: 5.50,
  stockLevel: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
});

// Add multiple records
await db.menuItems.bulkAdd([item1, item2, item3]);
```

#### Retrieving Records

```typescript
// Get by primary key
const item = await db.menuItems.get('item-1');

// Get all records
const allItems = await db.menuItems.toArray();

// Get first record
const firstItem = await db.menuItems.toCollection().first();

// Count records
const count = await db.menuItems.count();
```

#### Querying with Indexes

```typescript
// Filter by category (indexed)
const sandes = await db.menuItems
  .where('category')
  .equals(Category.SANDES)
  .toArray();

// Filter by session (indexed)
const sessionOrders = await db.orders
  .where('sessionId')
  .equals('session-1')
  .toArray();

// Sort by creation date (indexed)
const recentOrders = await db.orders
  .orderBy('createdAt')
  .reverse()
  .limit(10)
  .toArray();
```

#### Filtering Records

For non-indexed fields or complex conditions, use `filter()`:

```typescript
// Filter by boolean field
const activeItems = await db.menuItems
  .filter(item => item.isActive === true)
  .toArray();

// Complex filtering
const lowStockItems = await db.menuItems
  .filter(item => item.stockLevel < 5 && item.isActive)
  .toArray();
```

#### Updating Records

```typescript
// Update specific fields
await db.menuItems.update('item-1', {
  price: 6.00,
  updatedAt: new Date(),
});

// Update with a function
await db.menuItems.update('item-1', item => {
  item.stockLevel -= 1;
  item.updatedAt = new Date();
});
```

#### Deleting Records

```typescript
// Delete by primary key
await db.menuItems.delete('item-1');

// Delete multiple
await db.menuItems.bulkDelete(['item-1', 'item-2']);

// Delete with condition
await db.orders
  .where('sessionId')
  .equals('old-session')
  .delete();
```

### Transactions

Use transactions for atomic operations:

```typescript
await db.transaction('rw', db.orders, db.menuItems, async () => {
  // Create order
  const order = await db.orders.add({
    id: 'order-1',
    orderNumber: 1,
    sessionId: 'session-1',
    total: 10.50,
    isComplimentary: false,
    isCancelled: false,
    items: [],
    createdAt: new Date(),
    version: 1,
  });

  // Decrement stock for each item
  for (const item of orderItems) {
    await db.menuItems.update(item.menuItemId, menuItem => {
      menuItem.stockLevel -= item.quantity;
      menuItem.updatedAt = new Date();
    });
  }
});
```

If any operation fails, the entire transaction is rolled back.

### Utility Methods

The database instance provides several utility methods:

#### Get Database Statistics

```typescript
const stats = await db.getStats();
console.log(stats);
// {
//   users: 1,
//   menuItems: 25,
//   orders: 150,
//   orderItems: 350,
//   sessions: 10,
//   stockAdjustments: 200,
//   auditLogs: 500,
//   syncQueue: 5
// }
```

#### Clear All Data

```typescript
// Clear everything (use with caution!)
await db.clearAll();
```

#### Clear Session Data Only

```typescript
// Clear session-specific data while preserving menu and config
await db.clearSessionData();
```

## Indexing Strategy

### Primary Keys

All tables use string UUIDs as primary keys (field name: `id`).

### Indexes

Indexes are created for fields commonly used in queries:

- **menuItems**: `category`, `isActive`, `updatedAt`, `name`
- **orders**: `sessionId`, `orderNumber`, `createdAt`, `isCancelled`, `isComplimentary`
- **orderItems**: `orderId`, `menuItemId`
- **sessions**: `userId`, `isActive`, `startedAt`, `endedAt`
- **stockAdjustments**: `menuItemId`, `createdAt`, `adjustmentType`
- **auditLogs**: `userId`, `[entityType+entityId]`, `createdAt`, `action`
- **syncQueue**: `status`, `entityType`, `timestamp`, `[entityType+entityId]`

### Compound Indexes

Compound indexes (marked with `[field1+field2]`) allow efficient queries on multiple fields:

```typescript
// Query using compound index
const entityLogs = await db.auditLogs
  .where('[entityType+entityId]')
  .equals(['orders', 'order-123'])
  .toArray();
```

## Best Practices

### 1. Always Handle Errors

```typescript
try {
  await db.menuItems.add(item);
} catch (error) {
  if (error.name === 'ConstraintError') {
    console.error('Item with this ID already exists');
  } else {
    console.error('Database error:', error);
  }
}
```

### 2. Use Transactions for Related Changes

When multiple operations must succeed or fail together, use transactions.

### 3. Avoid Large Queries

When dealing with large datasets, use pagination:

```typescript
const pageSize = 50;
const page = 2;

const orders = await db.orders
  .orderBy('createdAt')
  .offset(page * pageSize)
  .limit(pageSize)
  .toArray();
```

### 4. Use Indexes Wisely

Queries using indexed fields are much faster. Design your queries around the available indexes.

### 5. Keep Version Numbers Updated

When updating records, increment the `version` field for optimistic locking:

```typescript
await db.menuItems.update('item-1', item => {
  item.price = 6.00;
  item.version += 1;
  item.updatedAt = new Date();
});
```

## Testing

The database configuration includes comprehensive tests. Run them with:

```bash
npm test src/lib/db.test.ts
```

Tests use `fake-indexeddb` to provide a clean, in-memory database for each test case.

## Troubleshooting

### "Database already exists" Error

If you encounter schema conflicts, close all database connections:

```typescript
await db.close();
await db.delete();
await db.open();
```

### Boolean Queries Not Working

IndexedDB doesn't support boolean values in indexes. Use `filter()` instead of `where()` for boolean fields:

```typescript
// ❌ Don't do this
await db.menuItems.where('isActive').equals(true).toArray();

// ✅ Do this instead
await db.menuItems.filter(item => item.isActive === true).toArray();
```

### Performance Issues

1. Ensure queries use indexed fields
2. Use pagination for large result sets
3. Consider bulk operations instead of loops
4. Use transactions for multiple related operations

## Migration Guide

When the schema changes, increment the version number and provide a migration:

```typescript
this.version(2).stores({
  // Updated schema
  menuItems: 'id, category, isActive, updatedAt, name, description',
  // ... other tables
}).upgrade(trans => {
  // Migration logic
  return trans.menuItems.toCollection().modify(item => {
    item.description = '';
  });
});
```

## References

- [Dexie.js Documentation](https://dexie.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Papa Bolotas Type Definitions](../types/index.ts)
