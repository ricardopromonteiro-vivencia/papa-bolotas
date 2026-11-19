/**
 * Unit tests for Zod validation schemas
 * 
 * Tests validation rules for:
 * - Menu items (price > 0, name non-empty)
 * - Orders (total calculation, complimentary validation)
 * - Stock adjustments (non-negative integers)
 * - Input sanitization and XSS protection
 */

import { describe, it, expect } from 'vitest';
import {
  // Schemas
  menuItemSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  loginCredentialsSchema,
  createOrderSchema,
  createOrderItemSchema,
  orderSchema,
  manualStockAdjustmentSchema,
  lossRecordSchema,
  orderCancellationSchema,
  stockAdjustmentRequestSchema,
  cashRegisterClosureSchema,
  // Utilities
  validateFormData,
  validateField,
  sanitizeInput,
  hasValidPortugueseChars,
  isWithinSafeRange,
  // Base validators
  positiveDecimal,
  nonNegativeInteger,
  positiveInteger,
  nonEmptyString,
  sanitizedString
} from './validation';
import { Category, AdjustmentType } from './index';

// ============================================================================
// MENU ITEM VALIDATION TESTS
// Requirements: 4.3 - Menu item validation (price > 0, name non-empty)
// ============================================================================

describe('Menu Item Validation', () => {
  describe('createMenuItemSchema', () => {
    it('validates valid menu item', () => {
      const validItem = {
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 4.50,
        stockLevel: 10,
        isActive: true
      };
      
      const result = createMenuItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const invalidItem = {
        name: '',
        category: Category.SANDES,
        price: 4.50,
        stockLevel: 10
      };
      
      const result = createMenuItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only name', () => {
      const invalidItem = {
        name: '   ',
        category: Category.SANDES,
        price: 4.50,
        stockLevel: 10
      };
      
      const result = createMenuItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('rejects zero price', () => {
      const invalidItem = {
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 0,
        stockLevel: 10
      };
      
      const result = createMenuItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const invalidItem = {
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: -5.00,
        stockLevel: 10
      };
      
      const result = createMenuItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('rejects negative stock level', () => {
      const invalidItem = {
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 4.50,
        stockLevel: -5
      };
      
      const result = createMenuItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('accepts zero stock level', () => {
      const validItem = {
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 4.50,
        stockLevel: 0
      };
      
      const result = createMenuItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('trims whitespace from name', () => {
      const item = {
        name: '  Sandes de Leitão  ',
        category: Category.SANDES,
        price: 4.50,
        stockLevel: 10
      };
      
      const result = createMenuItemSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Sandes de Leitão');
      }
    });

    it('rejects price exceeding maximum', () => {
      const invalidItem = {
        name: 'Expensive Item',
        category: Category.SANDES,
        price: 10000.00,
        stockLevel: 10
      };
      
      const result = createMenuItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('preserves Portuguese characters', () => {
      const item = {
        name: 'Francesinha à Tradicional',
        category: Category.SANDES,
        price: 6.50,
        stockLevel: 5
      };
      
      const result = createMenuItemSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Francesinha à Tradicional');
      }
    });
  });

  describe('updateMenuItemSchema', () => {
    it('allows partial updates', () => {
      const update = {
        price: 5.00
      };
      
      const result = updateMenuItemSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('validates price if provided', () => {
      const update = {
        price: -1.00
      };
      
      const result = updateMenuItemSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('allows empty update', () => {
      const update = {};
      
      const result = updateMenuItemSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// STOCK ADJUSTMENT VALIDATION TESTS
// Requirements: 8.4 - Stock validation (non-negative integers)
// ============================================================================

describe('Stock Adjustment Validation', () => {
  describe('manualStockAdjustmentSchema', () => {
    it('validates valid stock adjustment', () => {
      const adjustment = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        newLevel: 50,
        reason: 'Restocking'
      };
      
      const result = manualStockAdjustmentSchema.safeParse(adjustment);
      expect(result.success).toBe(true);
    });

    it('rejects negative stock level', () => {
      const adjustment = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        newLevel: -10,
        reason: 'Invalid'
      };
      
      const result = manualStockAdjustmentSchema.safeParse(adjustment);
      expect(result.success).toBe(false);
    });

    it('accepts zero stock level', () => {
      const adjustment = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        newLevel: 0,
        reason: 'Out of stock'
      };
      
      const result = manualStockAdjustmentSchema.safeParse(adjustment);
      expect(result.success).toBe(true);
    });

    it('rejects non-integer stock level', () => {
      const adjustment = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        newLevel: 5.5,
        reason: 'Invalid'
      };
      
      const result = manualStockAdjustmentSchema.safeParse(adjustment);
      expect(result.success).toBe(false);
    });

    it('rejects excessively high stock level', () => {
      const adjustment = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        newLevel: 100000,
        reason: 'Too much'
      };
      
      const result = manualStockAdjustmentSchema.safeParse(adjustment);
      expect(result.success).toBe(false);
    });
  });

  describe('lossRecordSchema', () => {
    it('validates valid loss record', () => {
      const loss = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 3,
        reason: 'Breakage'
      };
      
      const result = lossRecordSchema.safeParse(loss);
      expect(result.success).toBe(true);
    });

    it('rejects zero quantity', () => {
      const loss = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 0,
        reason: 'Invalid'
      };
      
      const result = lossRecordSchema.safeParse(loss);
      expect(result.success).toBe(false);
    });

    it('rejects negative quantity', () => {
      const loss = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: -5,
        reason: 'Invalid'
      };
      
      const result = lossRecordSchema.safeParse(loss);
      expect(result.success).toBe(false);
    });

    it('requires reason for loss', () => {
      const loss = {
        itemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 3,
        reason: ''
      };
      
      const result = lossRecordSchema.safeParse(loss);
      expect(result.success).toBe(false);
    });
  });

  describe('stockAdjustmentRequestSchema', () => {
    it('validates complete adjustment request', () => {
      const request = {
        menuItemId: '123e4567-e89b-12d3-a456-426614174000',
        adjustmentType: AdjustmentType.MANUAL,
        quantityChange: 10,
        previousLevel: 20,
        newLevel: 30
      };
      
      const result = stockAdjustmentRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('allows negative quantity change for decrements', () => {
      const request = {
        menuItemId: '123e4567-e89b-12d3-a456-426614174000',
        adjustmentType: AdjustmentType.ORDER,
        quantityChange: -5,
        previousLevel: 20,
        newLevel: 15
      };
      
      const result = stockAdjustmentRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// ORDER VALIDATION TESTS
// Requirements: 5.1, 5.3, 5.9 - Order validation
// ============================================================================

describe('Order Validation', () => {
  describe('createOrderItemSchema', () => {
    it('validates valid order item', () => {
      const item = {
        menuItemId: '123e4567-e89b-12d3-a456-426614174000',
        menuItemName: 'Sandes de Leitão',
        quantity: 2,
        unitPrice: 4.50,
        subtotal: 9.00
      };
      
      const result = createOrderItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('rejects zero quantity', () => {
      const item = {
        menuItemId: '123e4567-e89b-12d3-a456-426614174000',
        menuItemName: 'Sandes de Leitão',
        quantity: 0,
        unitPrice: 4.50,
        subtotal: 0
      };
      
      const result = createOrderItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('rejects incorrect subtotal calculation', () => {
      const item = {
        menuItemId: '123e4567-e89b-12d3-a456-426614174000',
        menuItemName: 'Sandes de Leitão',
        quantity: 2,
        unitPrice: 4.50,
        subtotal: 8.00 // Should be 9.00
      };
      
      const result = createOrderItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('accepts correct subtotal with rounding tolerance', () => {
      const item = {
        menuItemId: '123e4567-e89b-12d3-a456-426614174000',
        menuItemName: 'Sandes de Leitão',
        quantity: 3,
        unitPrice: 3.33,
        subtotal: 9.99
      };
      
      const result = createOrderItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });
  });

  describe('createOrderSchema', () => {
    it('validates valid order', () => {
      const order = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        total: 9.00,
        isComplimentary: false,
        items: [
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174001',
            menuItemName: 'Sandes de Leitão',
            quantity: 2,
            unitPrice: 4.50,
            subtotal: 9.00
          }
        ]
      };
      
      const result = createOrderSchema.safeParse(order);
      expect(result.success).toBe(true);
    });

    it('rejects order with no items', () => {
      const order = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        total: 0,
        isComplimentary: false,
        items: []
      };
      
      const result = createOrderSchema.safeParse(order);
      expect(result.success).toBe(false);
    });

    it('rejects order with mismatched total', () => {
      const order = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        total: 10.00, // Should be 9.00
        isComplimentary: false,
        items: [
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174001',
            menuItemName: 'Sandes de Leitão',
            quantity: 2,
            unitPrice: 4.50,
            subtotal: 9.00
          }
        ]
      };
      
      const result = createOrderSchema.safeParse(order);
      expect(result.success).toBe(false);
    });

    it('validates complimentary order with zero total', () => {
      const order = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        total: 0,
        isComplimentary: true,
        items: [
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174001',
            menuItemName: 'Sandes de Leitão',
            quantity: 1,
            unitPrice: 0,
            subtotal: 0
          }
        ]
      };
      
      const result = createOrderSchema.safeParse(order);
      expect(result.success).toBe(true);
    });

    it('rejects complimentary order with non-zero total', () => {
      const order = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        total: 5.00,
        isComplimentary: true,
        items: [
          {
            menuItemId: '123e4567-e89b-12d3-a456-426614174001',
            menuItemName: 'Sandes de Leitão',
            quantity: 1,
            unitPrice: 5.00,
            subtotal: 5.00
          }
        ]
      };
      
      const result = createOrderSchema.safeParse(order);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// AUTHENTICATION VALIDATION TESTS
// Requirements: 1.2, 1.8 - Password validation
// ============================================================================

describe('Authentication Validation', () => {
  describe('loginCredentialsSchema', () => {
    it('validates valid credentials', () => {
      const credentials = {
        username: 'admin',
        password: 'password123'
      };
      
      const result = loginCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(true);
    });

    it('rejects empty username', () => {
      const credentials = {
        username: '',
        password: 'password123'
      };
      
      const result = loginCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const credentials = {
        username: 'admin',
        password: 'pass1'
      };
      
      const result = loginCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it('rejects password without numbers', () => {
      const credentials = {
        username: 'admin',
        password: 'passwordonly'
      };
      
      const result = loginCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it('rejects password without letters', () => {
      const credentials = {
        username: 'admin',
        password: '12345678'
      };
      
      const result = loginCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it('trims username whitespace', () => {
      const credentials = {
        username: '  admin  ',
        password: 'password123'
      };
      
      const result = loginCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('admin');
      }
    });
  });
});

// ============================================================================
// ORDER CANCELLATION VALIDATION TESTS
// Requirements: 7.2, 7.3 - Security code validation
// ============================================================================

describe('Order Cancellation Validation', () => {
  describe('orderCancellationSchema', () => {
    it('validates 4-digit security code', () => {
      const cancellation = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        securityCode: '1234'
      };
      
      const result = orderCancellationSchema.safeParse(cancellation);
      expect(result.success).toBe(true);
    });

    it('validates 6-digit security code', () => {
      const cancellation = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        securityCode: '123456'
      };
      
      const result = orderCancellationSchema.safeParse(cancellation);
      expect(result.success).toBe(true);
    });

    it('rejects short security code', () => {
      const cancellation = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        securityCode: '123'
      };
      
      const result = orderCancellationSchema.safeParse(cancellation);
      expect(result.success).toBe(false);
    });

    it('rejects long security code', () => {
      const cancellation = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        securityCode: '1234567'
      };
      
      const result = orderCancellationSchema.safeParse(cancellation);
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric security code', () => {
      const cancellation = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        securityCode: 'abcd'
      };
      
      const result = orderCancellationSchema.safeParse(cancellation);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// CASH REGISTER CLOSURE VALIDATION TESTS
// Requirements: 11.3, 11.4, 11.5 - Closure validation
// ============================================================================

describe('Cash Register Closure Validation', () => {
  describe('cashRegisterClosureSchema', () => {
    it('validates valid closure data', () => {
      const closure = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        expectedCash: 150.00,
        actualCash: 148.50
      };
      
      const result = cashRegisterClosureSchema.safeParse(closure);
      expect(result.success).toBe(true);
    });

    it('rejects negative expected cash', () => {
      const closure = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        expectedCash: -50.00,
        actualCash: 100.00
      };
      
      const result = cashRegisterClosureSchema.safeParse(closure);
      expect(result.success).toBe(false);
    });

    it('rejects negative actual cash', () => {
      const closure = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        expectedCash: 100.00,
        actualCash: -50.00
      };
      
      const result = cashRegisterClosureSchema.safeParse(closure);
      expect(result.success).toBe(false);
    });

    it('accepts zero actual cash', () => {
      const closure = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        expectedCash: 100.00,
        actualCash: 0
      };
      
      const result = cashRegisterClosureSchema.safeParse(closure);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// VALIDATION UTILITY TESTS
// Requirements: 15.3, 15.8 - Input sanitization
// ============================================================================

describe('Validation Utilities', () => {
  describe('validateFormData', () => {
    it('returns parsed data on success', () => {
      const schema = createMenuItemSchema;
      const data = {
        name: 'Test Item',
        category: Category.SANDES,
        price: 5.00,
        stockLevel: 10
      };
      
      const result = validateFormData(schema, data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Item');
      }
    });

    it('returns field errors on failure', () => {
      const schema = createMenuItemSchema;
      const data = {
        name: '',
        category: Category.SANDES,
        price: -1,
        stockLevel: 10
      };
      
      const result = validateFormData(schema, data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveProperty('name');
        expect(result.errors).toHaveProperty('price');
      }
    });
  });

  describe('validateField', () => {
    it('returns null for valid value', () => {
      const error = validateField(positiveDecimal, 5.00);
      expect(error).toBeNull();
    });

    it('returns error message for invalid value', () => {
      const error = validateField(positiveDecimal, -1);
      expect(error).toBeTruthy();
      expect(error).toContain('greater than zero');
    });
  });

  describe('sanitizeInput', () => {
    it('removes angle brackets', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('removes javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(input);
      expect(sanitized.toLowerCase()).not.toContain('javascript:');
    });

    it('removes event handlers', () => {
      const input = 'onclick=alert("xss")';
      const sanitized = sanitizeInput(input);
      expect(sanitized.toLowerCase()).not.toContain('onclick=');
    });

    it('trims whitespace', () => {
      const input = '  normal text  ';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('normal text');
    });

    it('preserves safe content', () => {
      const input = 'Sandes de Leitão';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Sandes de Leitão');
    });
  });

  describe('hasValidPortugueseChars', () => {
    it('accepts standard Portuguese characters', () => {
      expect(hasValidPortugueseChars('Francesinha')).toBe(true);
      expect(hasValidPortugueseChars('à moda tradicional')).toBe(true);
      expect(hasValidPortugueseChars('Pão com chouriço')).toBe(true);
      expect(hasValidPortugueseChars('Açúcar')).toBe(true);
    });

    it('accepts numbers and common punctuation', () => {
      expect(hasValidPortugueseChars('Item #1')).toBe(true);
      expect(hasValidPortugueseChars('Price (2.50)')).toBe(true);
      expect(hasValidPortugueseChars('Test-Item_v2')).toBe(true);
    });

    it('rejects special characters that could be XSS', () => {
      expect(hasValidPortugueseChars('<script>')).toBe(false);
      expect(hasValidPortugueseChars('test@example.com')).toBe(false);
    });
  });

  describe('isWithinSafeRange', () => {
    it('accepts safe integers', () => {
      expect(isWithinSafeRange(100)).toBe(true);
      expect(isWithinSafeRange(-100)).toBe(true);
      expect(isWithinSafeRange(0)).toBe(true);
    });

    it('rejects unsafe integers', () => {
      expect(isWithinSafeRange(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
      expect(isWithinSafeRange(Number.MIN_SAFE_INTEGER - 1)).toBe(false);
    });
  });
});

// ============================================================================
// BASE VALIDATOR TESTS
// ============================================================================

describe('Base Validators', () => {
  describe('nonEmptyString', () => {
    it('accepts non-empty strings', () => {
      expect(nonEmptyString.safeParse('test').success).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(nonEmptyString.safeParse('').success).toBe(false);
    });

    it('rejects whitespace-only strings', () => {
      expect(nonEmptyString.safeParse('   ').success).toBe(false);
    });

    it('trims whitespace', () => {
      const result = nonEmptyString.safeParse('  test  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test');
      }
    });
  });

  describe('positiveDecimal', () => {
    it('accepts positive numbers', () => {
      expect(positiveDecimal.safeParse(5.50).success).toBe(true);
      expect(positiveDecimal.safeParse(0.01).success).toBe(true);
    });

    it('rejects zero', () => {
      expect(positiveDecimal.safeParse(0).success).toBe(false);
    });

    it('rejects negative numbers', () => {
      expect(positiveDecimal.safeParse(-1).success).toBe(false);
    });

    it('rejects infinity', () => {
      expect(positiveDecimal.safeParse(Infinity).success).toBe(false);
    });
  });

  describe('nonNegativeInteger', () => {
    it('accepts zero', () => {
      expect(nonNegativeInteger.safeParse(0).success).toBe(true);
    });

    it('accepts positive integers', () => {
      expect(nonNegativeInteger.safeParse(10).success).toBe(true);
    });

    it('rejects negative integers', () => {
      expect(nonNegativeInteger.safeParse(-1).success).toBe(false);
    });

    it('rejects decimals', () => {
      expect(nonNegativeInteger.safeParse(5.5).success).toBe(false);
    });
  });

  describe('positiveInteger', () => {
    it('accepts positive integers', () => {
      expect(positiveInteger.safeParse(1).success).toBe(true);
      expect(positiveInteger.safeParse(100).success).toBe(true);
    });

    it('rejects zero', () => {
      expect(positiveInteger.safeParse(0).success).toBe(false);
    });

    it('rejects negative integers', () => {
      expect(positiveInteger.safeParse(-1).success).toBe(false);
    });

    it('rejects decimals', () => {
      expect(positiveInteger.safeParse(1.5).success).toBe(false);
    });
  });
});
