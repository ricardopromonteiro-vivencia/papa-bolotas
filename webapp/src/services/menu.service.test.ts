/**
 * Menu Service Tests
 * 
 * Unit tests for MenuService with mocked dependencies
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MenuService, MenuServiceError } from './menu.service';
import { Category } from '@/types';
import type { MenuItem } from '@/types';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    menuItems: {
      toArray: vi.fn(() => Promise.resolve([])),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          and: vi.fn(() => ({
            toArray: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
      get: vi.fn(() => Promise.resolve(null)),
      add: vi.fn((item) => Promise.resolve(item.id)),
      put: vi.fn((item) => Promise.resolve(item.id)),
      bulkPut: vi.fn(() => Promise.resolve()),
    },
    syncQueue: {
      add: vi.fn(() => Promise.resolve('queue-id')),
    },
  },
}));

describe('MenuService', () => {
  let menuService: MenuService;

  beforeEach(() => {
    menuService = new MenuService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMenuItems', () => {
    it('should return all menu items from local database', async () => {
      const mockItems: MenuItem[] = [
        {
          id: '1',
          name: 'Sandes de Leitão',
          category: Category.SANDES,
          price: 5.5,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: '2',
          name: 'Coca-Cola',
          category: Category.BEBIDAS,
          price: 1.5,
          stockLevel: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.toArray).mockResolvedValueOnce(mockItems);
      
      // Mock offline mode to prevent Supabase calls
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const items = await menuService.getMenuItems();

      expect(items).toEqual(mockItems);
      expect(db.menuItems.toArray).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.toArray).mockRejectedValue(new Error('Database error'));

      await expect(menuService.getMenuItems()).rejects.toThrow(MenuServiceError);
    });
  });

  describe('getItemsByCategory', () => {
    it('should return items filtered by category', async () => {
      const mockItems: MenuItem[] = [
        {
          id: '1',
          name: 'Sandes de Leitão',
          category: Category.SANDES,
          price: 5.5,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      const { db } = await import('@/lib/db');
      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          and: vi.fn(() => ({
            toArray: vi.fn(() => Promise.resolve(mockItems)),
          })),
        })),
      }));
      vi.mocked(db.menuItems.where).mockImplementation(mockWhere);
      
      // Mock offline mode to prevent Supabase calls
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const items = await menuService.getItemsByCategory(Category.SANDES);

      expect(items).toEqual(mockItems);
      expect(db.menuItems.where).toHaveBeenCalledWith('category');
    });

    it('should throw error for invalid category', async () => {
      await expect(
        menuService.getItemsByCategory('Invalid' as Category)
      ).rejects.toThrow(MenuServiceError);
    });
  });

  describe('getMenuItem', () => {
    it('should return a single menu item by ID', async () => {
      const mockItem: MenuItem = {
        id: '1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(mockItem);

      const item = await menuService.getMenuItem('1');

      expect(item).toEqual(mockItem);
      expect(db.menuItems.get).toHaveBeenCalledWith('1');
    });

    it('should return null if item not found', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(null);

      const item = await menuService.getMenuItem('non-existent');

      expect(item).toBeNull();
    });

    it('should throw error for invalid ID', async () => {
      await expect(menuService.getMenuItem('')).rejects.toThrow(MenuServiceError);
    });
  });

  describe('createMenuItem', () => {
    it('should create a new menu item with valid data', async () => {
      const newItem = {
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.add).mockResolvedValue('new-id');

      const created = await menuService.createMenuItem(newItem);

      expect(created).toMatchObject(newItem);
      expect(created.id).toBeDefined();
      expect(created.version).toBe(1);
      expect(db.menuItems.add).toHaveBeenCalled();
    });

    it('should throw error if name is missing', async () => {
      const invalidItem = {
        name: '',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should throw error if price is negative', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: Category.SANDES,
        price: -5.5,
        stockLevel: 10,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should throw error if price has too many decimal places', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: Category.SANDES,
        price: 5.555,
        stockLevel: 10,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should throw error if stock level is negative', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: -10,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should throw error if stock level is not an integer', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10.5,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should throw error if category is invalid', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: 'Invalid' as Category,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });
  });

  describe('updateMenuItem', () => {
    it('should update an existing menu item', async () => {
      const existingItem: MenuItem = {
        id: '1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updates = {
        price: 6.0,
        stockLevel: 15,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(existingItem);
      vi.mocked(db.menuItems.put).mockResolvedValue('1');

      const updated = await menuService.updateMenuItem('1', updates);

      expect(updated.price).toBe(6.0);
      expect(updated.stockLevel).toBe(15);
      expect(updated.version).toBe(2);
      expect(db.menuItems.put).toHaveBeenCalled();
    });

    it('should throw error if item not found', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(null);

      await expect(
        menuService.updateMenuItem('non-existent', { price: 6.0 })
      ).rejects.toThrow(MenuServiceError);
    });

    it('should throw error for invalid price update', async () => {
      const existingItem: MenuItem = {
        id: '1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(existingItem);

      await expect(
        menuService.updateMenuItem('1', { price: -6.0 })
      ).rejects.toThrow(MenuServiceError);
    });
  });

  describe('deleteMenuItem', () => {
    it('should soft delete a menu item by setting isActive to false', async () => {
      const existingItem: MenuItem = {
        id: '1',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(existingItem);
      vi.mocked(db.menuItems.put).mockResolvedValue('1');

      await menuService.deleteMenuItem('1');

      expect(db.menuItems.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          isActive: false,
          version: 2,
        })
      );
    });

    it('should throw error if item not found', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.get).mockResolvedValue(null);

      await expect(menuService.deleteMenuItem('non-existent')).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should throw error for invalid ID', async () => {
      await expect(menuService.deleteMenuItem('')).rejects.toThrow(MenuServiceError);
    });
  });

  describe('getMenuItemsByCategory', () => {
    it('should return items grouped by category', async () => {
      const mockItems: MenuItem[] = [
        {
          id: '1',
          name: 'Sandes de Leitão',
          category: Category.SANDES,
          price: 5.5,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: '2',
          name: 'Coca-Cola',
          category: Category.BEBIDAS,
          price: 1.5,
          stockLevel: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: '3',
          name: 'Inactive Item',
          category: Category.DOCES,
          price: 2.0,
          stockLevel: 0,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.toArray).mockResolvedValueOnce(mockItems);
      
      // Mock offline mode to prevent Supabase calls
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const grouped = await menuService.getMenuItemsByCategory();

      expect(grouped[Category.SANDES]).toHaveLength(1);
      expect(grouped[Category.BEBIDAS]).toHaveLength(1);
      expect(grouped[Category.DOCES]).toHaveLength(0); // Inactive item not included
      expect(grouped[Category.BATATAS]).toHaveLength(0);
      expect(grouped[Category.TABUAS]).toHaveLength(0);
    });

    it('should return empty arrays for categories with no items', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.toArray).mockResolvedValue([]);

      const grouped = await menuService.getMenuItemsByCategory();

      expect(grouped[Category.SANDES]).toHaveLength(0);
      expect(grouped[Category.BEBIDAS]).toHaveLength(0);
      expect(grouped[Category.DOCES]).toHaveLength(0);
      expect(grouped[Category.BATATAS]).toHaveLength(0);
      expect(grouped[Category.TABUAS]).toHaveLength(0);
    });
  });

  describe('validation', () => {
    it('should validate name length', async () => {
      const longName = 'a'.repeat(101);
      const invalidItem = {
        name: longName,
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
      };

      await expect(menuService.createMenuItem(invalidItem)).rejects.toThrow(
        MenuServiceError
      );
    });

    it('should accept valid Portuguese characters in name', async () => {
      const validItem = {
        name: 'Sandes de Leitão à Bairrada',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 10,
        isActive: true,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.add).mockResolvedValue('new-id');

      const created = await menuService.createMenuItem(validItem);

      expect(created.name).toBe(validItem.name);
    });

    it('should accept price with 2 decimal places', async () => {
      const validItem = {
        name: 'Test Item',
        category: Category.SANDES,
        price: 5.55,
        stockLevel: 10,
        isActive: true,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.add).mockResolvedValue('new-id');

      const created = await menuService.createMenuItem(validItem);

      expect(created.price).toBe(5.55);
    });

    it('should accept zero price', async () => {
      const validItem = {
        name: 'Free Item',
        category: Category.SANDES,
        price: 0,
        stockLevel: 10,
        isActive: true,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.add).mockResolvedValue('new-id');

      const created = await menuService.createMenuItem(validItem);

      expect(created.price).toBe(0);
    });

    it('should accept zero stock level', async () => {
      const validItem = {
        name: 'Out of Stock',
        category: Category.SANDES,
        price: 5.5,
        stockLevel: 0,
        isActive: true,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.menuItems.add).mockResolvedValue('new-id');

      const created = await menuService.createMenuItem(validItem);

      expect(created.stockLevel).toBe(0);
    });
  });
});
