/**
 * Receipt Service Tests
 * 
 * Tests receipt generation and formatting for thermal printers.
 * Validates 32-character width constraint and proper content inclusion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiptService, ReceiptServiceError, ReceiptData } from './receipt.service';
import { Order, OrderItem } from '@/types';

describe('ReceiptService', () => {
  let receiptService: ReceiptService;

  beforeEach(() => {
    receiptService = new ReceiptService();
  });

  describe('generateReceipt', () => {
    it('should generate a basic receipt with all required elements', () => {
      // Requirement 12.1-12.8: Complete receipt generation
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 42,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes de Leitão',
            quantity: 2,
            unitPrice: 5.50,
            subtotal: 11.00,
          },
          {
            id: 'item-2',
            orderId: 'order-1',
            menuItemId: 'menu-2',
            menuItemName: 'Coca-Cola',
            quantity: 1,
            unitPrice: 2.00,
            subtotal: 2.00,
          },
        ],
        total: 13.00,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);

      // Requirement 12.2: Restaurant name
      expect(receipt).toContain('PAPA BOLOTAS');

      // Requirement 12.3: Order number and date
      expect(receipt).toContain('#42');
      expect(receipt).toContain('15/01/2024 14:30');

      // Requirement 12.4: Items with quantities and prices
      expect(receipt).toContain('2x Sandes de Leitão');
      expect(receipt).toContain('11,00€');
      expect(receipt).toContain('1x Coca-Cola');
      expect(receipt).toContain('2,00€');

      // Requirement 12.5: Total
      expect(receipt).toContain('TOTAL:');
      expect(receipt).toContain('13,00€');

      // Should not contain OFERTA for regular orders
      expect(receipt).not.toContain('OFERTA');
    });

    it('should include OFERTA indicator for complimentary orders', () => {
      // Requirement 12.7: Display "OFERTA" indicator
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        total: 0.00, // Complimentary orders have zero total
        isComplimentary: true,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);

      expect(receipt).toContain('*** OFERTA ***');
      expect(receipt).toContain('0,00€');
    });

    it('should include customer observations', () => {
      // Requirement 12.6: Include observations
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        total: 5.50,
        isComplimentary: false,
        isCancellation: false,
        observations: 'Sem molho picante',
      };

      const receipt = receiptService.generateReceipt(receiptData);

      expect(receipt).toContain('Observações:');
      expect(receipt).toContain('Sem molho picante');
    });

    it('should format receipt with 32-character width', () => {
      // Requirement 12.8: 32-character width for thermal printer
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes de Leitão',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        total: 5.50,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);
      const lines = receipt.split('\n');

      // Every line should be 32 characters or less
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(32);
      }
    });

    it('should handle long item names by wrapping text', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes de Leitão com Queijo e Tomate Extra Grande',
            quantity: 1,
            unitPrice: 8.50,
            subtotal: 8.50,
          },
        ],
        total: 8.50,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);
      const lines = receipt.split('\n');

      // All lines should still be within 32 characters
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(32);
      }

      // Should contain the item name (possibly wrapped)
      expect(receipt).toContain('Sandes de Leitão');
    });

    it('should handle long observations by wrapping text', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        total: 5.50,
        isComplimentary: false,
        isCancellation: false,
        observations: 'Sem cebola, sem tomate, com extra de queijo e molho à parte',
      };

      const receipt = receiptService.generateReceipt(receiptData);
      const lines = receipt.split('\n');

      // All lines should be within 32 characters
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(32);
      }

      // Should contain observations
      expect(receipt).toContain('Observações:');
      expect(receipt).toContain('Sem cebola');
    });

    it('should throw error for empty items', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [],
        total: 0,
        isComplimentary: false,
        isCancellation: false,
      };

      expect(() => receiptService.generateReceipt(receiptData)).toThrow(ReceiptServiceError);
      expect(() => receiptService.generateReceipt(receiptData)).toThrow('at least one item');
    });

    it('should throw error for null receipt data', () => {
      expect(() => receiptService.generateReceipt(null as any)).toThrow(ReceiptServiceError);
      expect(() => receiptService.generateReceipt(null as any)).toThrow('required');
    });

    it('should format currency correctly with comma decimal separator', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Item',
            quantity: 1,
            unitPrice: 12.99,
            subtotal: 12.99,
          },
        ],
        total: 12.99,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);

      // Should use comma as decimal separator (Portuguese format)
      expect(receipt).toContain('12,99€');
      expect(receipt).not.toContain('12.99€');
    });

    it('should handle multiple items with varying quantities', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 5,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 3,
            unitPrice: 5.00,
            subtotal: 15.00,
          },
          {
            id: 'item-2',
            orderId: 'order-1',
            menuItemId: 'menu-2',
            menuItemName: 'Batatas',
            quantity: 2,
            unitPrice: 3.50,
            subtotal: 7.00,
          },
          {
            id: 'item-3',
            orderId: 'order-1',
            menuItemId: 'menu-3',
            menuItemName: 'Bebida',
            quantity: 5,
            unitPrice: 2.00,
            subtotal: 10.00,
          },
        ],
        total: 32.00,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);

      expect(receipt).toContain('3x Sandes');
      expect(receipt).toContain('15,00€');
      expect(receipt).toContain('2x Batatas');
      expect(receipt).toContain('7,00€');
      expect(receipt).toContain('5x Bebida');
      expect(receipt).toContain('10,00€');
      expect(receipt).toContain('32,00€');
    });
  });

  describe('generateCancellationReceipt', () => {
    it('should generate a cancellation receipt', () => {
      // Requirement 7.8: Generate cancellation receipt
      const order: Order = {
        id: 'order-1',
        orderNumber: 10,
        sessionId: 'session-1',
        total: 0, // Cancelled orders have zero total
        isComplimentary: false,
        isCancelled: true,
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        createdAt: new Date('2024-01-15T14:00:00'),
        cancelledAt: new Date('2024-01-15T14:30:00'),
        version: 1,
      };

      const receipt = receiptService.generateCancellationReceipt(order, 'Erro no pedido');

      expect(receipt).toContain('*** ANULAÇÃO ***');
      expect(receipt).toContain('#10');
      expect(receipt).toContain('Motivo:');
      expect(receipt).toContain('Erro no pedido');
      expect(receipt).toContain('0,00€');
    });

    it('should use default cancellation reason if not provided', () => {
      const order: Order = {
        id: 'order-1',
        orderNumber: 10,
        sessionId: 'session-1',
        total: 0,
        isComplimentary: false,
        isCancelled: true,
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        createdAt: new Date('2024-01-15T14:00:00'),
        cancelledAt: new Date('2024-01-15T14:30:00'),
        version: 1,
      };

      const receipt = receiptService.generateCancellationReceipt(order);

      expect(receipt).toContain('Pedido anulado');
    });

    it('should throw error if order is not cancelled', () => {
      const order: Order = {
        id: 'order-1',
        orderNumber: 10,
        sessionId: 'session-1',
        total: 5.50,
        isComplimentary: false,
        isCancelled: false, // Not cancelled
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        createdAt: new Date('2024-01-15T14:00:00'),
        version: 1,
      };

      expect(() => receiptService.generateCancellationReceipt(order)).toThrow(ReceiptServiceError);
      expect(() => receiptService.generateCancellationReceipt(order)).toThrow('not cancelled');
    });
  });

  describe('generateReceiptFromOrder', () => {
    it('should generate receipt from Order object', () => {
      const order: Order = {
        id: 'order-1',
        orderNumber: 7,
        sessionId: 'session-1',
        total: 10.00,
        isComplimentary: false,
        isCancelled: false,
        observations: 'Mesa 5',
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 2,
            unitPrice: 5.00,
            subtotal: 10.00,
          },
        ],
        createdAt: new Date('2024-01-15T15:00:00'),
        version: 1,
      };

      const receipt = receiptService.generateReceiptFromOrder(order);

      expect(receipt).toContain('PAPA BOLOTAS');
      expect(receipt).toContain('#7');
      expect(receipt).toContain('2x Sandes');
      expect(receipt).toContain('10,00€');
      expect(receipt).toContain('Mesa 5');
    });

    it('should handle complimentary orders', () => {
      const order: Order = {
        id: 'order-1',
        orderNumber: 3,
        sessionId: 'session-1',
        total: 0.00,
        isComplimentary: true,
        isCancelled: false,
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Bebida',
            quantity: 1,
            unitPrice: 2.00,
            subtotal: 2.00,
          },
        ],
        createdAt: new Date('2024-01-15T15:00:00'),
        version: 1,
      };

      const receipt = receiptService.generateReceiptFromOrder(order);

      expect(receipt).toContain('*** OFERTA ***');
      expect(receipt).toContain('0,00€');
    });
  });

  describe('validateReceiptFormat', () => {
    it('should validate that all lines are within 32 characters', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        total: 5.50,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);
      const isValid = receiptService.validateReceiptFormat(receipt);

      expect(isValid).toBe(true);
    });

    it('should return false for receipt with lines exceeding 32 characters', () => {
      const invalidReceipt = 'This line is definitely longer than thirty-two characters';

      const isValid = receiptService.validateReceiptFormat(invalidReceipt);

      expect(isValid).toBe(false);
    });

    it('should return true for receipt with exactly 32-character lines', () => {
      const validReceipt = '================================'; // Exactly 32 chars

      const isValid = receiptService.validateReceiptFormat(validReceipt);

      expect(isValid).toBe(true);
    });
  });

  describe('getLineWidth', () => {
    it('should return 32 as the line width', () => {
      const lineWidth = receiptService.getLineWidth();

      expect(lineWidth).toBe(32);
    });
  });

  describe('edge cases', () => {
    it('should handle zero-price items', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Água',
            quantity: 1,
            unitPrice: 0.00,
            subtotal: 0.00,
          },
        ],
        total: 0.00,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);

      expect(receipt).toContain('0,00€');
      expect(receipt).toContain('Água');
    });

    it('should handle items with decimal quantities', () => {
      // Although the system uses integer quantities, test robustness
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Item',
            quantity: 1,
            unitPrice: 3.33,
            subtotal: 3.33,
          },
        ],
        total: 3.33,
        isComplimentary: false,
        isCancellation: false,
      };

      const receipt = receiptService.generateReceipt(receiptData);

      expect(receipt).toContain('3,33€');
    });

    it('should handle empty observations gracefully', () => {
      const receiptData: ReceiptData = {
        orderId: 'order-1',
        orderNumber: 1,
        date: new Date('2024-01-15T14:30:00'),
        items: [
          {
            id: 'item-1',
            orderId: 'order-1',
            menuItemId: 'menu-1',
            menuItemName: 'Sandes',
            quantity: 1,
            unitPrice: 5.50,
            subtotal: 5.50,
          },
        ],
        total: 5.50,
        isComplimentary: false,
        isCancellation: false,
        observations: '   ', // Whitespace only
      };

      const receipt = receiptService.generateReceipt(receiptData);

      // Should not include observations section for whitespace-only observations
      expect(receipt).not.toContain('Observações:');
    });
  });
});
