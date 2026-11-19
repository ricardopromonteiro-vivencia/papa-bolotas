# TypeScript Types Documentation

This document provides an overview of the core TypeScript types, interfaces, and type guards used throughout the Papa Bolotas webapp.

## Overview

The type system is designed to:
- Provide type safety across the entire application
- Match the database schema (PostgreSQL and IndexedDB)
- Support offline-first architecture with synchronization
- Enable runtime type validation through type guards

## Enums

### Category
Menu item categories for organizing products.

```typescript
enum Category {
  SANDES = 'Sandes',
  TABUAS = 'Tábuas',
  BATATAS = 'Batatas',
  DOCES = 'Doces',
  BEBIDAS = 'Bebidas'
}
```

**Usage:**
```typescript
const item: MenuItem = {
  category: Category.SANDES,
  // ...other fields
};
```

### AdjustmentType
Types of stock level adjustments.

```typescript
enum AdjustmentType {
  MANUAL = 'manual',       // Manual adjustment by user
  ORDER = 'order',         // Automatic decrement from order
  CANCELLATION = 'cancellation', // Automatic increment from cancellation
  LOSS = 'loss'           // Loss or breakage recording
}
```

### SyncOperation
CRUD operations for the synchronization queue.

```typescript
enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}
```

### SyncState
Current state of the synchronization engine.

```typescript
enum SyncState {
  ONLINE = 'online',      // Connected and synced
  OFFLINE = 'offline',    // No connection
  SYNCING = 'syncing',    // Actively synchronizing
  ERROR = 'error'         // Sync error occurred
}
```

### SyncStatus
Status of individual items in the sync queue.

```typescript
enum SyncStatus {
  PENDING = 'pending',    // Waiting to sync
  SYNCING = 'syncing',    // Currently syncing
  SYNCED = 'synced',      // Successfully synced
  FAILED = 'failed'       // Sync failed
}
```

## Core Domain Types

### User
System user (admin role only in MVP).

```typescript
interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
```

### MenuItem
Product available for sale.

```typescript
interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;              // Must be >= 0
  stockLevel: number;         // Must be >= 0
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: string;
  version: number;            // For optimistic locking
}
```

**Constraints:**
- `price >= 0`
- `stockLevel >= 0`
- `name` must be non-empty
- `category` must be valid Category enum value

### Order
Customer order with line items.

```typescript
interface Order {
  id: string;
  orderNumber: number;        // Sequential per session
  sessionId: string;
  total: number;              // Must be >= 0
  isComplimentary: boolean;   // Zero-cost order
  isCancelled: boolean;
  observations?: string;
  items: OrderItem[];
  createdBy?: string;
  createdAt: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  version: number;
}
```

### OrderItem
Individual item within an order.

```typescript
interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;       // Denormalized for historical accuracy
  quantity: number;           // Must be > 0
  unitPrice: number;          // Must be >= 0
  subtotal: number;           // quantity * unitPrice
}
```

**Note:** `menuItemName` is denormalized to preserve the item name at the time of order, even if the menu item is later renamed or deleted.

### Session
Work session from login to cash register closure.

```typescript
interface Session {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;             // Set when session closes
  expectedCash?: number;      // Calculated from orders
  actualCash?: number;        // Input by user at closure
  discrepancy?: number;       // actualCash - expectedCash
  isActive: boolean;
  version: number;
}
```

### StockAdjustment
Audit trail for stock level changes.

```typescript
interface StockAdjustment {
  id: string;
  menuItemId: string;
  adjustmentType: AdjustmentType;
  quantityChange: number;     // Can be negative
  previousLevel: number;
  newLevel: number;
  reason?: string;
  createdBy?: string;
  createdAt: Date;
}
```

## Synchronization Types

### SyncQueueItem
Item in the offline synchronization queue.

```typescript
interface SyncQueueItem {
  id: string;
  entityType: string;         // 'orders', 'menuItems', etc.
  entityId: string;
  operation: SyncOperation;
  data: any;                  // Entity data to sync
  timestamp: Date;
  retryCount: number;
  status: SyncStatus;
}
```

### SyncResult
Result of a synchronization operation.

```typescript
interface SyncResult {
  success: boolean;
  itemsSynced: number;
  conflicts: Conflict[];
  errors: Error[];
}
```

## Type Guards

Type guards provide runtime type validation and enable TypeScript type narrowing.

### isUser(value: unknown): value is User
Validates that a value is a properly formed User object.

```typescript
if (isUser(data)) {
  // TypeScript now knows data is User
  console.log(data.username);
}
```

### isMenuItem(value: unknown): value is MenuItem
Validates menu item structure including:
- Valid category
- Non-negative price and stock level
- Required fields present

```typescript
if (isMenuItem(item)) {
  // Safe to use as MenuItem
  const total = item.price * quantity;
}
```

### isOrder(value: unknown): value is Order
Validates order structure including:
- All required fields
- Valid items array
- Non-negative total

```typescript
if (isOrder(data)) {
  // TypeScript knows data is Order
  console.log(`Order #${data.orderNumber}`);
}
```

### Other Type Guards
- `isOrderItem(value)` - Validates order item
- `isSession(value)` - Validates session
- `isStockAdjustment(value)` - Validates stock adjustment
- `isCategory(value)` - Validates category enum
- `isSyncQueueItem(value)` - Validates sync queue item

## Utility Types

### CreateMenuItem
Type for creating a new menu item (omits generated fields).

```typescript
type CreateMenuItem = Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'version'>;

const newItem: CreateMenuItem = {
  name: 'Sandes de Leitão',
  category: Category.SANDES,
  price: 5.50,
  stockLevel: 10,
  isActive: true
};
```

### UpdateMenuItem
Partial type for updating an existing menu item.

```typescript
type UpdateMenuItem = Partial<Omit<MenuItem, 'id' | 'createdAt' | 'version'>>;

const updates: UpdateMenuItem = {
  price: 6.00,
  stockLevel: 15
};
```

### CreateOrder
Type for creating a new order before persistence.

```typescript
type CreateOrder = Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'version' | 'items'> & {
  items: Omit<OrderItem, 'id' | 'orderId'>[];
};
```

## Usage Examples

### Creating a Menu Item
```typescript
import { Category, type MenuItem, isMenuItem } from '@/types';

// Create new item
const item: MenuItem = {
  id: crypto.randomUUID(),
  name: 'Sandes de Leitão',
  category: Category.SANDES,
  price: 5.50,
  stockLevel: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1
};

// Validate before saving
if (isMenuItem(item)) {
  await db.menuItems.add(item);
}
```

### Processing an Order
```typescript
import { type Order, type OrderItem, isOrder } from '@/types';

// Build order
const order: Order = {
  id: crypto.randomUUID(),
  orderNumber: 1,
  sessionId: currentSession.id,
  items: orderItems,
  total: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
  isComplimentary: false,
  isCancelled: false,
  createdAt: new Date(),
  version: 1
};

// Validate
if (isOrder(order)) {
  await db.orders.add(order);
}
```

### Handling API Responses
```typescript
import { isMenuItem, type MenuItem } from '@/types';

async function fetchMenuItems(): Promise<MenuItem[]> {
  const response = await fetch('/api/menu-items');
  const data = await response.json();
  
  // Validate each item
  const items = data.filter(isMenuItem);
  
  if (items.length !== data.length) {
    console.warn('Some items failed validation');
  }
  
  return items;
}
```

## Best Practices

1. **Always use type guards for external data**
   - API responses
   - User input
   - LocalStorage/IndexedDB data
   - WebSocket messages

2. **Use utility types for operations**
   - `CreateMenuItem` for new items
   - `UpdateMenuItem` for partial updates
   - Avoid manually omitting fields

3. **Leverage TypeScript's type narrowing**
   - After a type guard, TypeScript knows the exact type
   - No need for type assertions

4. **Document constraints in JSDoc**
   ```typescript
   /**
    * @param quantity - Must be greater than 0
    * @throws {ValidationError} if quantity <= 0
    */
   function addItem(quantity: number) { }
   ```

5. **Use enums for fixed sets of values**
   - Provides autocomplete
   - Prevents typos
   - Self-documenting

## Testing

All types and type guards are covered by unit tests in `index.test.ts`. Run tests with:

```bash
npm test
```

## See Also

- [Database Schema](../../supabase/README.md) - PostgreSQL schema
- [IndexedDB Configuration](../lib/db.ts) - Local database setup
- [Design Document](../../../.kiro/specs/papa-bolotas-webapp/design.md) - Full system design
