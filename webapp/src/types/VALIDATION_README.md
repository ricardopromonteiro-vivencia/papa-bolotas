# Validation Schemas

This directory contains comprehensive Zod validation schemas for the Papa Bolotas Webapp. All data validation follows strict rules to ensure data integrity, security, and compliance with business requirements.

## Overview

The validation module (`validation.ts`) provides:
- **Type-safe validation** using Zod schemas
- **Input sanitization** for XSS protection
- **Form validation utilities** for easy integration
- **Portuguese character support** for menu items

## Key Features

### 1. Menu Item Validation (Requirement 4.3)
- ✅ Price must be greater than zero
- ✅ Name must be non-empty after trimming
- ✅ Stock level must be non-negative integer
- ✅ Preserves Portuguese characters (ã, õ, ç, á, é, í, ó, ú)

```typescript
import { createMenuItemSchema, validateFormData } from '@/types/validation';

const result = validateFormData(createMenuItemSchema, {
  name: 'Francesinha à Tradicional',
  category: 'Sandes',
  price: 6.50,
  stockLevel: 10
});

if (result.success) {
  // Use result.data
} else {
  // Show result.errors to user
}
```

### 2. Stock Adjustment Validation (Requirement 8.4)
- ✅ Stock levels must be non-negative integers
- ✅ Loss quantities must be positive integers
- ✅ Requires reason for loss recording

```typescript
import { manualStockAdjustmentSchema } from '@/types/validation';

const adjustment = manualStockAdjustmentSchema.parse({
  itemId: 'uuid',
  newLevel: 50,
  reason: 'Restocking'
});
```

### 3. Order Validation (Requirements 5.1, 5.3, 5.9)
- ✅ Orders must contain at least one item
- ✅ Total must match sum of item subtotals
- ✅ Complimentary orders must have zero total
- ✅ Quantities must be positive integers

```typescript
import { createOrderSchema } from '@/types/validation';

const order = createOrderSchema.parse({
  sessionId: 'uuid',
  total: 9.00,
  isComplimentary: false,
  items: [
    {
      menuItemId: 'uuid',
      menuItemName: 'Sandes de Leitão',
      quantity: 2,
      unitPrice: 4.50,
      subtotal: 9.00
    }
  ]
});
```

### 4. Authentication Validation (Requirements 1.2, 1.8)
- ✅ Password minimum 8 characters
- ✅ Password must contain letters and numbers
- ✅ Username required and trimmed

```typescript
import { loginCredentialsSchema } from '@/types/validation';

const credentials = loginCredentialsSchema.parse({
  username: 'admin',
  password: 'securePass123'
});
```

### 5. Input Sanitization (Requirements 15.3, 15.8)
- ✅ Removes angle brackets (< >)
- ✅ Removes javascript: protocol
- ✅ Removes event handlers (onclick=, etc.)
- ✅ Trims whitespace

```typescript
import { sanitizeInput } from '@/types/validation';

const safe = sanitizeInput('<script>alert("xss")</script>');
// Result: 'scriptalert("xss")/script'
```

## Available Schemas

### Menu & Stock
- `menuItemSchema` - Full menu item with all fields
- `createMenuItemSchema` - New menu item (no id/timestamps)
- `updateMenuItemSchema` - Partial menu item updates
- `stockAdjustmentSchema` - Stock adjustment record
- `manualStockAdjustmentSchema` - Manual stock change input
- `lossRecordSchema` - Loss/breakage recording

### Orders
- `orderSchema` - Complete order with items
- `createOrderSchema` - New order creation
- `orderItemSchema` - Individual order item
- `createOrderItemSchema` - New order item
- `orderCancellationSchema` - Order cancellation with security code
- `receiptSchema` - Receipt data

### Authentication
- `loginCredentialsSchema` - Login form validation
- `userSchema` - User record
- `sessionSchema` - Work session
- `authSessionSchema` - Auth session with tokens

### Reporting
- `salesReportSchema` - Session sales report
- `cashRegisterClosureSchema` - Cash register closure data

### Synchronization
- `syncQueueItemSchema` - Sync queue item
- `syncResultSchema` - Sync operation result
- `queueStatusSchema` - Current sync status

## Utility Functions

### validateFormData(schema, data)
Validates form data and returns either parsed data or field-level errors.

```typescript
const result = validateFormData(menuItemSchema, formData);
if (result.success) {
  console.log(result.data); // Typed and validated data
} else {
  console.log(result.errors); // { fieldName: 'error message' }
}
```

### validateField(schema, value)
Validates a single field value.

```typescript
const error = validateField(positiveDecimal, price);
if (error) {
  showError(error); // 'Must be greater than zero'
}
```

### sanitizeInput(input)
Sanitizes a string by removing potentially dangerous characters.

```typescript
const safe = sanitizeInput(userInput);
```

### hasValidPortugueseChars(input)
Checks if input contains only valid Portuguese characters.

```typescript
if (hasValidPortugueseChars('Francesinha à Tradicional')) {
  // Safe to use
}
```

### isWithinSafeRange(value)
Checks if a number is within JavaScript's safe integer range.

```typescript
if (isWithinSafeRange(Number.MAX_SAFE_INTEGER + 1)) {
  // Handle unsafe number
}
```

## Base Validators

Reusable validation primitives:

- `nonEmptyString` - Non-empty trimmed string
- `positiveDecimal` - Positive number (> 0)
- `nonNegativeInteger` - Integer >= 0
- `positiveInteger` - Integer > 0
- `uuid` - Valid UUID format
- `dateSchema` - Date or ISO string
- `sanitizedString(min, max)` - Sanitized string with length constraints

## Testing

All validation schemas have comprehensive test coverage in `validation.test.ts`:
- 78 test cases covering all validation rules
- Edge cases for boundary values
- XSS protection tests
- Portuguese character preservation tests

Run tests with:
```bash
npm test -- validation.test.ts
```

## Type Exports

All schemas export inferred TypeScript types:

```typescript
import type {
  CreateMenuItem,
  UpdateMenuItem,
  CreateOrder,
  LoginCredentials,
  ManualStockAdjustment,
  LossRecord,
  OrderCancellation,
  CashRegisterClosure
} from '@/types/validation';
```

## Requirements Coverage

| Requirement | Description | Schema |
|-------------|-------------|--------|
| 4.3 | Menu item validation (price > 0, name non-empty) | `createMenuItemSchema` |
| 5.1, 5.3 | Order validation | `createOrderSchema` |
| 5.9 | Complimentary order validation | `createOrderSchema` |
| 7.2, 7.3 | Security code validation | `orderCancellationSchema` |
| 8.4 | Stock validation (non-negative integers) | `manualStockAdjustmentSchema` |
| 9.3, 9.4 | Loss recording validation | `lossRecordSchema` |
| 1.2, 1.8 | Password validation | `loginCredentialsSchema` |
| 11.3-11.5 | Cash register closure validation | `cashRegisterClosureSchema` |
| 15.3, 15.8 | Input sanitization and XSS protection | `sanitizeInput` |
| 4.6, 18.7 | Portuguese character support | `hasValidPortugueseChars` |

## Best Practices

1. **Always validate user input** before processing
2. **Use `validateFormData`** for form validation with field-level errors
3. **Sanitize text inputs** using `sanitizedString` or `sanitizeInput`
4. **Handle validation errors gracefully** and show meaningful messages to users
5. **Test validation logic** when adding new schemas
6. **Use type inference** from schemas instead of duplicating types

## Examples

### Form Validation with Error Handling

```typescript
import { createMenuItemSchema, validateFormData } from '@/types/validation';

function handleFormSubmit(formData: unknown) {
  const result = validateFormData(createMenuItemSchema, formData);
  
  if (!result.success) {
    // Show errors next to form fields
    Object.entries(result.errors).forEach(([field, message]) => {
      showFieldError(field, message);
    });
    return;
  }
  
  // result.data is fully typed and validated
  await saveMenuItem(result.data);
}
```

### Real-time Field Validation

```typescript
import { validateField, positiveDecimal } from '@/types/validation';

function onPriceChange(value: string) {
  const price = parseFloat(value);
  const error = validateField(positiveDecimal, price);
  
  if (error) {
    setFieldError('price', error);
  } else {
    clearFieldError('price');
  }
}
```

### Safe Data Transformation

```typescript
import { createOrderSchema } from '@/types/validation';

// Parse and validate in one step
try {
  const validOrder = createOrderSchema.parse(rawOrderData);
  // validOrder is fully typed and validated
  await saveOrder(validOrder);
} catch (error) {
  if (error instanceof z.ZodError) {
    handleValidationErrors(error);
  }
}
```

## Migration from Plain TypeScript

If you're migrating from plain TypeScript types to validated schemas:

```typescript
// Before (no validation)
interface MenuItem {
  name: string;
  price: number;
  stockLevel: number;
}

function createItem(item: MenuItem) {
  // Unchecked data
  await db.insert(item);
}

// After (with validation)
import { createMenuItemSchema } from '@/types/validation';

function createItem(itemData: unknown) {
  // Validate first
  const item = createMenuItemSchema.parse(itemData);
  // Now guaranteed to be valid
  await db.insert(item);
}
```

## Contributing

When adding new validation schemas:

1. Define the schema in `validation.ts`
2. Add comprehensive tests in `validation.test.ts`
3. Document the schema in this README
4. Export inferred types for TypeScript usage
5. Link to relevant requirements in comments
