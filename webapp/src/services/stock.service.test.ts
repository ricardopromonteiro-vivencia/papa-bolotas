/**
 * Stock Service Unit Tests
 * 
 * Tests for stock management functionality including:
 * - Getting stock levels
 * - Manual adjustments
 * - Automatic decrements/increments
 * - Loss recording
 * - Validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { StockService, StockServiceError } from './stock.service';
import { Category, AdjustmentType, MenuItem } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

// Mock environment config
vi.mock('@/config/env', () => ({
  env: {
    security: {
      securityCode: '1234',
    },
  },
}));

// Test database class
class TestPapaDB extends Dexie {
  menuItems!: Dexie.Table<MenuItem, string>;
  stockAdjustments!: Dexie.Table<any, string>;
  syncQueue!: Dexie.Table<any, string>;

  constructor() {
    super('TestPapaDB');
    
    this.version(1).stores({
      menuItems: 'id, category, isActive, updatedAt, stockLevel',
      stockAdjustments: 'id, menuItemId, createdAt',
      syncQueue: 'id, entityType, status, timestamp',
    });
  }
}

// Mock the database
let testDb: TestPapaDB;

vi.mock('@/lib/db', () => ({
  get db() {
    return testDb;
  },
}));

describe('StockService', () => {
  let stockService: StockService;

  beforeEach(async () => {
    // Create fresh test database for each test
    testDb = new TestPapaDB();
    await testDb.delete();
    await testDb.open();

    stockService = new StockService();

    // Mock navigator.onLine to simulate offline mode (avoid Supabase calls)
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
  });

  describe('getStockLevels', () => {
    it('should return empty array when no items exist', async () => {
      const levels = await stockService.getStockLevels();
      
      expect(levels).toEqual([]);
    });

    it('should return stock levels for all active menu items', async () => {
      // Add test menu items
      await testDb.menuItems.bulkAdd([
        {
          id: 'item-1',
          name: 'Sandes de Leitão',
          category: Category.SANDES,
          price: 5.50,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          version: 1,
        },
        {
          id: 'item-2',
          name: 'Coca-Cola',
          category: Category.BEBIDAS,
          price: 2.00,
          stockLevel: 25,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          version: 1,
        },
        {
          id: 'item-3',
          name: 'Inactive Item',
          category: Category.DOCES,
          price: 3.00,
          stockLevel: 5,
          isActive: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          version: 1,
        },
      ]);

      const levels = await stockService.getStockLevels();

      expect(levels).toHaveLength(2);
      expect(levels).toContainEqual({
        itemId: 'item-1',
        itemName: 'Sandes de Leitão',
        currentLevel: 10,
        lastAdjustedAt: new Date('2024-01-01'),
      });
      expect(levels).toContainEqual({
        itemId: 'item-2',
        itemName: 'Coca-Cola',
        currentLevel: 25,
        lastAdjustedAt: new Date('2024-01-02'),
      });
    });
  });

  describe('getStockLevel', () => {
    it('should return stock level for a specific menu item', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      const level = await stockService.getStockLevel('item-1');

      expect(level).toEqual({
        itemId: 'item-1',
        itemName: 'Sandes de Leitão',
        currentLevel: 10,
        lastAdjustedAt: new Date('2024-01-01'),
      });
    });

    it('should return null for non-existent item', async () => {
      const level = await stockService.getStockLevel('non-existent');

      expect(level).toBeNull();
    });

    it('should throw error for invalid item ID', async () => {
      await expect(stockService.getStockLevel('')).rejects.toThrow(StockServiceError);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock level to a new value', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.adjustStock('item-1', 15, 'Manual adjustment', 'user-1');

      const item = await testDb.menuItems.get('item-1');
      expect(item?.stockLevel).toBe(15);
    });

    it('should record adjustment in stock_adjustments table', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.adjustStock('item-1', 15, 'Manual adjustment', 'user-1');

      const adjustments = await testDb.stockAdjustments.toArray();
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toMatchObject({
        menuItemId: 'item-1',
        adjustmentType: AdjustmentType.MANUAL,
        quantityChange: 5,
        previousLevel: 10,
        newLevel: 15,
        reason: 'Manual adjustment',
        createdBy: 'user-1',
      });
    });

    it('should throw error for negative stock level', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.adjustStock('item-1', -5)
      ).rejects.toThrow(StockServiceError);
    });

    it('should throw error for non-integer stock level', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.adjustStock('item-1', 10.5)
      ).rejects.toThrow(StockServiceError);
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        stockService.adjustStock('non-existent', 10)
      ).rejects.toThrow(StockServiceError);
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock level by quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.decrementStock('item-1', 3, 'Order item');

      const item = await testDb.menuItems.get('item-1');
      expect(item?.stockLevel).toBe(7);
    });

    it('should record ORDER adjustment type', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.decrementStock('item-1', 3, 'Order item');

      const adjustments = await testDb.stockAdjustments.toArray();
      expect(adjustments[0]).toMatchObject({
        adjustmentType: AdjustmentType.ORDER,
        quantityChange: -3,
        previousLevel: 10,
        newLevel: 7,
      });
    });

    it('should allow decrement resulting in negative stock', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 5,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.decrementStock('item-1', 10, 'Order item');

      const item = await testDb.menuItems.get('item-1');
      expect(item?.stockLevel).toBe(-5);
    });

    it('should throw error for non-positive quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.decrementStock('item-1', 0)
      ).rejects.toThrow(StockServiceError);

      await expect(
        stockService.decrementStock('item-1', -5)
      ).rejects.toThrow(StockServiceError);
    });

    it('should throw error for non-integer quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.decrementStock('item-1', 2.5)
      ).rejects.toThrow(StockServiceError);
    });
  });

  describe('incrementStock', () => {
    it('should increment stock level by quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.incrementStock('item-1', 5, 'Order cancelled');

      const item = await testDb.menuItems.get('item-1');
      expect(item?.stockLevel).toBe(15);
    });

    it('should record CANCELLATION adjustment type', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.incrementStock('item-1', 5, 'Order cancelled');

      const adjustments = await testDb.stockAdjustments.toArray();
      expect(adjustments[0]).toMatchObject({
        adjustmentType: AdjustmentType.CANCELLATION,
        quantityChange: 5,
        previousLevel: 10,
        newLevel: 15,
      });
    });

    it('should throw error for non-positive quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.incrementStock('item-1', 0)
      ).rejects.toThrow(StockServiceError);
    });
  });

  describe('recordLoss', () => {
    it('should decrement stock and record loss adjustment', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.recordLoss('item-1', 2, 'Breakage', 'user-1');

      const item = await testDb.menuItems.get('item-1');
      expect(item?.stockLevel).toBe(8);

      const adjustments = await testDb.stockAdjustments.toArray();
      expect(adjustments[0]).toMatchObject({
        adjustmentType: AdjustmentType.LOSS,
        quantityChange: -2,
        previousLevel: 10,
        newLevel: 8,
        reason: 'Breakage',
        createdBy: 'user-1',
      });
    });

    it('should allow loss quantity exceeding current stock', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 5,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await stockService.recordLoss('item-1', 10, 'Expired');

      const item = await testDb.menuItems.get('item-1');
      expect(item?.stockLevel).toBe(-5);
    });

    it('should throw error for non-positive quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.recordLoss('item-1', 0, 'Test')
      ).rejects.toThrow(StockServiceError);

      await expect(
        stockService.recordLoss('item-1', -5, 'Test')
      ).rejects.toThrow(StockServiceError);
    });

    it('should throw error for non-integer quantity', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.recordLoss('item-1', 2.5, 'Test')
      ).rejects.toThrow(StockServiceError);
    });

    it('should throw error for missing reason', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      await expect(
        stockService.recordLoss('item-1', 2, '')
      ).rejects.toThrow(StockServiceError);
    });
  });

  describe('getAdjustmentHistory', () => {
    it('should return adjustment history for a menu item', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      // Create multiple adjustments
      await testDb.stockAdjustments.bulkAdd([
        {
          id: 'adj-1',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.MANUAL,
          quantityChange: 5,
          previousLevel: 10,
          newLevel: 15,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'adj-2',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.ORDER,
          quantityChange: -3,
          previousLevel: 15,
          newLevel: 12,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'adj-3',
          menuItemId: 'item-2',
          adjustmentType: AdjustmentType.LOSS,
          quantityChange: -2,
          previousLevel: 20,
          newLevel: 18,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const history = await stockService.getAdjustmentHistory('item-1');

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('adj-2'); // Most recent first
      expect(history[1].id).toBe('adj-1');
    });

    it('should limit results when limit parameter is provided', async () => {
      await testDb.menuItems.add({
        id: 'item-1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
      });

      // Create multiple adjustments
      await testDb.stockAdjustments.bulkAdd([
        {
          id: 'adj-1',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.MANUAL,
          quantityChange: 5,
          previousLevel: 10,
          newLevel: 15,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'adj-2',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.ORDER,
          quantityChange: -3,
          previousLevel: 15,
          newLevel: 12,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'adj-3',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.LOSS,
          quantityChange: -2,
          previousLevel: 12,
          newLevel: 10,
          createdAt: new Date('2024-01-03'),
        },
      ]);

      const history = await stockService.getAdjustmentHistory('item-1', 2);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('adj-3'); // Most recent
      expect(history[1].id).toBe('adj-2');
    });
  });

  describe('getAdjustmentsByDateRange', () => {
    it('should return adjustments within date range', async () => {
      await testDb.stockAdjustments.bulkAdd([
        {
          id: 'adj-1',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.MANUAL,
          quantityChange: 5,
          previousLevel: 10,
          newLevel: 15,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'adj-2',
          menuItemId: 'item-1',
          adjustmentType: AdjustmentType.ORDER,
          quantityChange: -3,
          previousLevel: 15,
          newLevel: 12,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'adj-3',
          menuItemId: 'item-2',
          adjustmentType: AdjustmentType.LOSS,
          quantityChange: -2,
          previousLevel: 20,
          newLevel: 18,
          createdAt: new Date('2024-02-01'),
        },
      ]);

      const adjustments = await stockService.getAdjustmentsByDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(adjustments).toHaveLength(2);
      expect(adjustments.map(a => a.id)).toContain('adj-1');
      expect(adjustments.map(a => a.id)).toContain('adj-2');
      expect(adjustments.map(a => a.id)).not.toContain('adj-3');
    });

    it('should throw error for invalid date range', async () => {
      await expect(
        stockService.getAdjustmentsByDateRange(
          new Date('2024-02-01'),
          new Date('2024-01-01')
        )
      ).rejects.toThrow(StockServiceError);
    });
  });
});
