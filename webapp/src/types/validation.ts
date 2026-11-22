/**
 * Zod Validation Schemas for Papa Bolotas Webapp
 * 
 * This module provides comprehensive validation schemas using Zod for all data models.
 * Validates user inputs, API responses, and form data to ensure data integrity.
 * 
 * Requirements:
 * - 4.3: Menu item validation (price > 0, name non-empty)
 * - 8.4: Stock adjustment validation (non-negative integers)
 * - 15.8: Input sanitization and validation
 */

import { z } from 'zod';

// Import enums separately to avoid circular dependencies
// Note: These are not actively used in runtime but needed for type definitions

// ============================================================================
// BASIC VALIDATION UTILITIES
// ============================================================================

/**
 * Validates that a string is non-empty after trimming
 */
const nonEmptyString = z.string().trim().min(1, 'This field is required');

/**
 * Validates positive decimal numbers (prices, monetary values)
 */
const positiveDecimal = z.number().positive('Must be greater than zero').finite();

/**
 * Validates non-negative integers (stock levels, quantities)
 */
const nonNegativeInteger = z.number().int().nonnegative('Must be zero or greater');

/**
 * Validates positive integers (quantities > 0)
 */
const positiveInteger = z.number().int().positive('Must be at least 1');

/**
 * Validates UUID format
 */
const uuid = z.string().uuid('Invalid ID format');

/**
 * Validates date objects or ISO strings and converts to Date
 */
const dateSchema = z.union([
  z.date(),
  z.string().datetime().transform((str) => new Date(str))
]);

/**
 * Sanitizes string input by trimming and limiting length
 */
const sanitizedString = (minLength: number = 1, maxLength: number = 255) => 
  z.string()
    .trim()
    .min(minLength, minLength > 0 ? 'This field is required' : undefined)
    .max(maxLength, `Maximum ${maxLength} characters allowed`)
    .transform((str) => str.replace(/[<>]/g, '')); // Remove potential XSS characters

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

// Define enum values directly to avoid circular dependency
const CategoryValues = {
  SANDES: 'Sandes',
  TABUAS: 'Tábuas',
  BATATAS: 'Batatas',
  DOCES: 'Doces',
  BEBIDAS: 'Bebidas'
} as const;

const UserRoleValues = {
  ADMIN: 'admin'
} as const;

const AdjustmentTypeValues = {
  MANUAL: 'manual',
  ORDER: 'order',
  CANCELLATION: 'cancellation',
  LOSS: 'loss'
} as const;

const SyncOperationValues = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
} as const;

const SyncStateValues = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SYNCING: 'syncing',
  ERROR: 'error'
} as const;

const SyncStatusValues = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed'
} as const;

const OrderStatusValues = {
  COMPLETED: 'completed',
  COMPLIMENTARY: 'complimentary',
  CANCELLED: 'cancelled'
} as const;

const AuditActionValues = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE_ORDER: 'create_order',
  CANCEL_ORDER: 'cancel_order',
  UPDATE_MENU_ITEM: 'update_menu_item',
  ADJUST_STOCK: 'adjust_stock',
  CLOSE_SESSION: 'close_session'
} as const;

export const categorySchema = z.enum([
  CategoryValues.SANDES,
  CategoryValues.TABUAS,
  CategoryValues.BATATAS,
  CategoryValues.DOCES,
  CategoryValues.BEBIDAS
]);

export const userRoleSchema = z.enum([UserRoleValues.ADMIN]);

export const adjustmentTypeSchema = z.enum([
  AdjustmentTypeValues.MANUAL,
  AdjustmentTypeValues.ORDER,
  AdjustmentTypeValues.CANCELLATION,
  AdjustmentTypeValues.LOSS
]);

export const syncOperationSchema = z.enum([
  SyncOperationValues.CREATE,
  SyncOperationValues.UPDATE,
  SyncOperationValues.DELETE
]);

export const syncStateSchema = z.enum([
  SyncStateValues.ONLINE,
  SyncStateValues.OFFLINE,
  SyncStateValues.SYNCING,
  SyncStateValues.ERROR
]);

export const syncStatusSchema = z.enum([
  SyncStatusValues.PENDING,
  SyncStatusValues.SYNCING,
  SyncStatusValues.SYNCED,
  SyncStatusValues.FAILED
]);

export const orderStatusSchema = z.enum([
  OrderStatusValues.COMPLETED,
  OrderStatusValues.COMPLIMENTARY,
  OrderStatusValues.CANCELLED
]);

export const auditActionSchema = z.enum([
  AuditActionValues.LOGIN,
  AuditActionValues.LOGOUT,
  AuditActionValues.CREATE_ORDER,
  AuditActionValues.CANCEL_ORDER,
  AuditActionValues.UPDATE_MENU_ITEM,
  AuditActionValues.ADJUST_STOCK,
  AuditActionValues.CLOSE_SESSION
]);

// ============================================================================
// USER AND AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * User schema validation
 */
export const userSchema = z.object({
  id: uuid,
  username: nonEmptyString,
  role: userRoleSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema
});

/**
 * Session schema validation
 */
export const sessionSchema = z.object({
  id: uuid,
  userId: uuid,
  startedAt: dateSchema,
  endedAt: dateSchema.optional(),
  expectedCash: positiveDecimal.optional(),
  actualCash: z.number().nonnegative().optional(),
  discrepancy: z.number().optional(),
  isActive: z.boolean(),
  version: positiveInteger
});

/**
 * Authentication session schema
 */
export const authSessionSchema = z.object({
  user: userSchema,
  accessToken: nonEmptyString,
  refreshToken: nonEmptyString,
  expiresAt: dateSchema
});

/**
 * Login credentials validation
 * Requirements: 1.2, 1.8 - Password complexity (min 8 chars, alphanumeric)
 */
export const loginCredentialsSchema = z.object({
  username: z.string()
    .trim()
    .min(1, 'Username is required')
    .max(50, 'Username too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain letters and numbers')
});

// ============================================================================
// MENU AND STOCK SCHEMAS
// ============================================================================

/**
 * Menu item validation schema
 * Requirements: 4.3 - Price > 0, name non-empty, stock >= 0
 */
export const menuItemSchema = z.object({
  id: uuid,
  name: sanitizedString(1, 100),
  category: categorySchema,
  price: positiveDecimal.max(9999.99, 'Price too high'),
  stockLevel: nonNegativeInteger,
  isActive: z.boolean(),
  trackStock: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  lastModifiedBy: uuid.optional(),
  version: positiveInteger
});

/**
 * Create menu item schema (without id, timestamps, version)
 * Requirements: 4.3 - Validate new menu items
 */
export const createMenuItemSchema = z.object({
  name: sanitizedString(1, 100),
  category: categorySchema,
  price: positiveDecimal.max(9999.99, 'Price too high'),
  stockLevel: nonNegativeInteger.default(0),
  isActive: z.boolean().default(true),
  trackStock: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  lastModifiedBy: uuid.optional()
});

/**
 * Update menu item schema (partial fields)
 */
export const updateMenuItemSchema = z.object({
  name: sanitizedString(1, 100).optional(),
  category: categorySchema.optional(),
  price: positiveDecimal.max(9999.99, 'Price too high').optional(),
  stockLevel: nonNegativeInteger.optional(),
  isActive: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  lastModifiedBy: uuid.optional(),
  updatedAt: dateSchema.optional()
});

/**
 * Stock level schema
 */
export const stockLevelSchema = z.object({
  itemId: uuid,
  itemName: nonEmptyString,
  currentLevel: nonNegativeInteger,
  lastAdjustedAt: dateSchema
});

/**
 * Stock adjustment schema
 * Requirements: 8.4 - Non-negative integer validation
 */
export const stockAdjustmentSchema = z.object({
  id: uuid,
  menuItemId: uuid,
  adjustmentType: adjustmentTypeSchema,
  quantityChange: z.number().int(),
  previousLevel: nonNegativeInteger,
  newLevel: nonNegativeInteger,
  reason: sanitizedString(0, 500).optional(),
  createdBy: uuid.optional(),
  createdAt: dateSchema
});

/**
 * Stock adjustment request schema (for manual adjustments)
 * Requirements: 8.4 - Validate stock adjustments
 */
export const stockAdjustmentRequestSchema = z.object({
  menuItemId: uuid,
  adjustmentType: adjustmentTypeSchema,
  quantityChange: z.number().int(),
  previousLevel: nonNegativeInteger,
  newLevel: nonNegativeInteger.refine(
    (val) => val >= 0,
    'Stock level cannot be negative'
  ),
  reason: sanitizedString(0, 500).optional(),
  createdBy: uuid.optional()
});

/**
 * Manual stock adjustment input schema
 * Requirements: 8.4 - Validate user input for stock changes
 */
export const manualStockAdjustmentSchema = z.object({
  itemId: uuid,
  newLevel: nonNegativeInteger.max(9999, 'Stock level too high'),
  reason: sanitizedString(0, 500).optional()
});

/**
 * Loss/breakage recording schema
 * Requirements: 9.3, 9.4 - Positive integer validation
 */
export const lossRecordSchema = z.object({
  itemId: uuid,
  quantity: positiveInteger.max(9999, 'Quantity too high'),
  reason: sanitizedString(1, 500),
  confirmOverstock: z.boolean().optional()
});

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

/**
 * Order item validation schema
 */
export const orderItemSchema = z.object({
  id: uuid,
  orderId: uuid,
  menuItemId: uuid,
  menuItemName: sanitizedString(1, 100),
  quantity: positiveInteger.max(999, 'Quantity too high'),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative()
}).refine(
  (data) => Math.abs(data.subtotal - (data.quantity * data.unitPrice)) < 0.01,
  { message: 'Subtotal must equal quantity × unit price' }
);

/**
 * Order validation schema
 */
export const orderSchema = z.object({
  id: uuid,
  orderNumber: positiveInteger,
  sessionId: uuid,
  total: z.number().nonnegative(),
  isComplimentary: z.boolean(),
  isCancelled: z.boolean(),
  observations: sanitizedString(0, 500).optional(),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  createdBy: uuid.optional(),
  createdAt: dateSchema,
  cancelledAt: dateSchema.optional(),
  cancelledBy: uuid.optional(),
  version: positiveInteger
}).refine(
  (data) => {
    // If complimentary, total should be 0
    if (data.isComplimentary && data.total !== 0) return false;
    return true;
  },
  { message: 'Complimentary orders must have zero total' }
);

/**
 * Create order item schema (before persistence)
 */
export const createOrderItemSchema = z.object({
  menuItemId: uuid,
  menuItemName: sanitizedString(1, 100),
  quantity: positiveInteger.max(999, 'Quantity too high'),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative()
}).refine(
  (data) => Math.abs(data.subtotal - (data.quantity * data.unitPrice)) < 0.01,
  { message: 'Subtotal must equal quantity × unit price' }
);

/**
 * Create order schema (before persistence)
 * Requirements: 5.1, 5.3 - Validate order creation
 */
export const createOrderSchema = z.object({
  sessionId: uuid,
  total: z.number().nonnegative(),
  isComplimentary: z.boolean().default(false),
  isCancelled: z.boolean().default(false),
  observations: sanitizedString(0, 500).optional(),
  items: z.array(createOrderItemSchema).min(1, 'Order must contain at least one item'),
  createdBy: uuid.optional()
}).refine(
  (data) => {
    // Validate total matches sum of item subtotals
    const calculatedTotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    return Math.abs(data.total - calculatedTotal) < 0.01;
  },
  { message: 'Order total must match sum of item subtotals' }
).refine(
  (data) => {
    // If complimentary, total must be 0
    if (data.isComplimentary && data.total !== 0) return false;
    return true;
  },
  { message: 'Complimentary orders must have zero total' }
);

/**
 * Order observations input schema
 * Requirements: 5.4, 15.8 - Sanitize customer observations
 */
export const orderObservationsSchema = z.object({
  observations: sanitizedString(0, 500).optional()
});

/**
 * Receipt schema
 */
export const receiptSchema = z.object({
  orderId: uuid,
  orderNumber: positiveInteger,
  date: dateSchema,
  items: z.array(orderItemSchema).min(1),
  total: z.number().nonnegative(),
  isComplimentary: z.boolean(),
  observations: sanitizedString(0, 500).optional()
});

/**
 * Order cancellation request schema
 * Requirements: 7.2, 7.3 - Validate security code
 */
export const orderCancellationSchema = z.object({
  orderId: uuid,
  securityCode: z.string()
    .regex(/^\d{4,6}$/, 'Security code must be 4-6 digits')
});

// ============================================================================
// REPORTING SCHEMAS
// ============================================================================

/**
 * Sales report schema
 */
export const salesReportSchema = z.object({
  sessionId: uuid,
  sessionStart: dateSchema,
  sessionEnd: dateSchema.optional(),
  totalRevenue: z.number().nonnegative(),
  completedOrders: nonNegativeInteger,
  complimentaryOrders: nonNegativeInteger,
  cancelledOrders: nonNegativeInteger,
  itemsSold: z.array(z.object({
    itemName: nonEmptyString,
    quantity: positiveInteger,
    subtotal: z.number().nonnegative()
  }))
});

/**
 * Cash register closure schema
 * Requirements: 11.3, 11.4, 11.5 - Validate closure data
 */
export const cashRegisterClosureSchema = z.object({
  sessionId: uuid,
  expectedCash: positiveDecimal,
  actualCash: z.number().nonnegative()
}).refine(
  (data) => data.actualCash >= 0,
  { message: 'Actual cash cannot be negative' }
);

// ============================================================================
// SYNCHRONIZATION SCHEMAS
// ============================================================================

/**
 * Sync queue item schema
 */
export const syncQueueItemSchema = z.object({
  id: uuid,
  entityType: nonEmptyString,
  entityId: uuid,
  operation: syncOperationSchema,
  data: z.any(),
  timestamp: dateSchema,
  retryCount: nonNegativeInteger.max(10, 'Max retries exceeded'),
  status: syncStatusSchema
});

/**
 * Sync result schema
 */
export const syncResultSchema = z.object({
  success: z.boolean(),
  itemsSynced: nonNegativeInteger,
  conflicts: z.array(z.object({
    entityType: nonEmptyString,
    entityId: uuid,
    localVersion: z.any(),
    remoteVersion: z.any(),
    resolution: z.enum(['local', 'remote', 'manual']).optional()
  })),
  errors: z.array(z.any())
});

/**
 * Queue status schema
 */
export const queueStatusSchema = z.object({
  pendingItems: nonNegativeInteger,
  lastSyncAt: dateSchema.optional(),
  state: syncStateSchema
});

// ============================================================================
// AUDIT SCHEMAS
// ============================================================================

/**
 * Audit log schema
 */
export const auditLogSchema = z.object({
  id: uuid,
  userId: uuid.optional(),
  action: nonEmptyString,
  entityType: nonEmptyString,
  entityId: uuid.optional(),
  details: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i, 'Invalid IP address').optional(),
  createdAt: dateSchema
});

// ============================================================================
// FORM VALIDATION UTILITIES
// ============================================================================

/**
 * Validates and sanitizes form input data
 * 
 * @param schema - Zod schema to validate against
 * @param data - Raw form data
 * @returns Validation result with parsed data or errors
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Convert Zod errors to field-level error messages
  const errors: Record<string, string> = {};
  const zodError = result.error as any;
  
  if (zodError.issues && Array.isArray(zodError.issues)) {
    zodError.issues.forEach((err: any) => {
      const path = err.path?.join('.') || 'general';
      errors[path] = err.message;
    });
  }
  
  return { success: false, errors };
}

/**
 * Validates a single field value
 * 
 * @param schema - Zod schema for the field
 * @param value - Field value to validate
 * @returns Error message or null if valid
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): string | null {
  const result = schema.safeParse(value);
  
  if (result.success) {
    return null;
  }
  
  const zodError = result.error as any;
  return zodError.issues?.[0]?.message || 'Invalid value';
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * Requirements: 15.3, 15.8 - XSS protection
 * 
 * @param input - Raw string input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validates that a numeric input is within safe integer range
 * 
 * @param value - Numeric value to validate
 * @returns True if within safe range
 */
export function isWithinSafeRange(value: number): boolean {
  return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER;
}

/**
 * Validates Portuguese characters are preserved (ã, õ, ç, á, é, í, ó, ú)
 * Requirements: 4.6, 18.7 - Portuguese character support
 * 
 * @param input - String to validate
 * @returns True if contains valid Portuguese characters
 */
export function hasValidPortugueseChars(input: string): boolean {
  // Allow Portuguese characters: à, á, â, ã, ç, é, ê, í, ó, ô, õ, ú, numbers, spaces, and common punctuation
  const portuguesePattern = /^[a-zA-Z0-9\sàáâãçéêíóôõú\-_.()#]+$/i;
  return portuguesePattern.test(input);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export inferred types from schemas
export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
export type CreateMenuItem = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItem = z.infer<typeof updateMenuItemSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type CreateOrderItem = z.infer<typeof createOrderItemSchema>;
export type ManualStockAdjustment = z.infer<typeof manualStockAdjustmentSchema>;
export type LossRecord = z.infer<typeof lossRecordSchema>;
export type OrderCancellation = z.infer<typeof orderCancellationSchema>;
export type CashRegisterClosure = z.infer<typeof cashRegisterClosureSchema>;
export type StockAdjustmentRequest = z.infer<typeof stockAdjustmentRequestSchema>;

// Re-export all validation schemas for convenience
export {
  nonEmptyString,
  positiveDecimal,
  nonNegativeInteger,
  positiveInteger,
  uuid,
  dateSchema,
  sanitizedString
};
