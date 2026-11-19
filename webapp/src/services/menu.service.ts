/**
 * Menu Service
 * 
 * Handles all menu item operations including CRUD operations, category filtering,
 * and synchronization between online (Supabase) and offline (IndexedDB) storage.
 * 
 * Requirements:
 * - 4.1: Organize menu items into categories
 * - 4.2: Add new menu items with validation
 * - 4.8: Display menu items grouped by category
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { MenuItem, Category, CreateMenuItem, UpdateMenuItem } from '@/types';

/**
 * Custom error class for menu service failures
 */
export class MenuServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'MenuServiceError';
  }
}

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  backoffMultiplier: 2,
};

/**
 * Menu Service
 * 
 * Provides comprehensive menu management with offline-first architecture.
 * All operations write to IndexedDB first, then sync to Supabase when online.
 */
export class MenuService {
  /**
   * Check if the application is currently online
   * @returns true if online, false if offline
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Sleep utility for retry delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   * @param fn - Function to retry
   * @param attempt - Current attempt number
   * @returns Result of the function
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= RETRY_CONFIG.maxAttempts - 1) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );

      if (import.meta.env.DEV) {
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      }

      await this.sleep(delay);
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  /**
   * Get all menu items
   * 
   * Implements offline-first pattern: reads from IndexedDB,
   * syncs with Supabase if online.
   * 
   * Requirements:
   * - 4.8: Display menu items
   * 
   * @returns Promise resolving to array of menu items
   * @throws MenuServiceError if operation fails
   */
  async getMenuItems(): Promise<MenuItem[]> {
    try {
      // Always read from local database first (offline-first)
      const localItems = await db.menuItems.toArray();

      // If online, fetch from Supabase and sync
      if (this.isOnline()) {
        try {
          const { data, error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .select('*')
              .eq('is_active', true)
              .order('name');
          });

          if (error) {
            console.warn('Failed to fetch from Supabase, using local data:', error);
            return localItems;
          }

          if (data) {
            // Map Supabase data to our MenuItem format
            const remoteItems: MenuItem[] = data.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category as Category,
              price: parseFloat(item.price),
              stockLevel: item.stock_level,
              isActive: item.is_active,
              createdAt: new Date(item.created_at),
              updatedAt: new Date(item.updated_at),
              lastModifiedBy: item.last_modified_by,
              version: item.version,
            }));

            // Update local database with remote data
            await this.syncLocalWithRemote(remoteItems);

            return remoteItems;
          }
        } catch (syncError) {
          console.warn('Sync failed, using local data:', syncError);
        }
      }

      return localItems;

    } catch (error) {
      console.error('Error getting menu items:', error);
      throw new MenuServiceError(
        'Failed to retrieve menu items',
        'GET_ITEMS_ERROR',
        500
      );
    }
  }

  /**
   * Get menu items filtered by category
   * 
   * Requirements:
   * - 4.1: Organize menu items into categories
   * - 4.8: Display menu items grouped by category
   * 
   * @param category - Category to filter by
   * @returns Promise resolving to array of menu items in the category
   * @throws MenuServiceError if operation fails
   */
  async getItemsByCategory(category: Category): Promise<MenuItem[]> {
    try {
      // Validate category
      if (!Object.values(Category).includes(category)) {
        throw new MenuServiceError(
          `Invalid category: ${category}`,
          'INVALID_CATEGORY',
          400
        );
      }

      // Read from local database first
      const localItems = await db.menuItems
        .where('category')
        .equals(category)
        .and(item => item.isActive === true)
        .toArray();

      // If online, fetch from Supabase
      if (this.isOnline()) {
        try {
          const { data, error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .select('*')
              .eq('category', category)
              .eq('is_active', true)
              .order('name');
          });

          if (error) {
            console.warn('Failed to fetch category from Supabase, using local data:', error);
            return localItems;
          }

          if (data) {
            const remoteItems: MenuItem[] = data.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category as Category,
              price: parseFloat(item.price),
              stockLevel: item.stock_level,
              isActive: item.is_active,
              createdAt: new Date(item.created_at),
              updatedAt: new Date(item.updated_at),
              lastModifiedBy: item.last_modified_by,
              version: item.version,
            }));

            // Update local database
            await this.syncLocalWithRemote(remoteItems);

            return remoteItems;
          }
        } catch (syncError) {
          console.warn('Category sync failed, using local data:', syncError);
        }
      }

      return localItems;

    } catch (error) {
      if (error instanceof MenuServiceError) {
        throw error;
      }

      console.error('Error getting items by category:', error);
      throw new MenuServiceError(
        `Failed to retrieve items for category: ${category}`,
        'GET_CATEGORY_ERROR',
        500
      );
    }
  }

  /**
   * Get a single menu item by ID
   * 
   * @param id - Menu item ID
   * @returns Promise resolving to menu item or null if not found
   * @throws MenuServiceError if operation fails
   */
  async getMenuItem(id: string): Promise<MenuItem | null> {
    try {
      // Validate ID
      if (!id || id.trim().length === 0) {
        throw new MenuServiceError(
          'Menu item ID is required',
          'INVALID_ID',
          400
        );
      }

      // Read from local database first
      const localItem = await db.menuItems.get(id);

      // If online, verify with Supabase
      if (this.isOnline()) {
        try {
          const { data, error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .select('*')
              .eq('id', id)
              .single();
          });

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn('Failed to fetch item from Supabase, using local data:', error);
            return localItem || null;
          }

          if (data) {
            const remoteItem: MenuItem = {
              id: data.id,
              name: data.name,
              category: data.category as Category,
              price: parseFloat(data.price),
              stockLevel: data.stock_level,
              isActive: data.is_active,
              createdAt: new Date(data.created_at),
              updatedAt: new Date(data.updated_at),
              lastModifiedBy: data.last_modified_by,
              version: data.version,
            };

            // Update local database
            await db.menuItems.put(remoteItem);

            return remoteItem;
          }
        } catch (syncError) {
          console.warn('Item sync failed, using local data:', syncError);
        }
      }

      return localItem || null;

    } catch (error) {
      if (error instanceof MenuServiceError) {
        throw error;
      }

      console.error('Error getting menu item:', error);
      throw new MenuServiceError(
        'Failed to retrieve menu item',
        'GET_ITEM_ERROR',
        500
      );
    }
  }

  /**
   * Create a new menu item
   * 
   * Requirements:
   * - 4.2: Add new menu items with name, category, price, and stock level
   * - 4.3: Validate that price is a positive decimal number
   * 
   * @param item - Menu item data to create
   * @returns Promise resolving to created menu item
   * @throws MenuServiceError if validation fails or operation fails
   */
  async createMenuItem(item: CreateMenuItem): Promise<MenuItem> {
    try {
      // Validate input
      this.validateMenuItem(item);

      // Create menu item object
      const now = new Date();
      const newItem: MenuItem = {
        id: crypto.randomUUID(),
        ...item,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      // Write to local database first (offline-first)
      await db.menuItems.add(newItem);

      // If online, write to Supabase
      if (this.isOnline()) {
        try {
          const { error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .insert({
                id: newItem.id,
                name: newItem.name,
                category: newItem.category,
                price: newItem.price,
                stock_level: newItem.stockLevel,
                is_active: newItem.isActive,
                last_modified_by: newItem.lastModifiedBy,
                version: newItem.version,
              });
          });

          if (error) {
            console.warn('Failed to create item in Supabase, queued for sync:', error);
            // Queue for later sync
            await this.queueForSync('create', newItem);
          }
        } catch (syncError) {
          console.warn('Failed to sync new item:', syncError);
          await this.queueForSync('create', newItem);
        }
      } else {
        // Offline: queue for sync when connection is restored
        await this.queueForSync('create', newItem);
      }

      if (import.meta.env.DEV) {
        console.log('Menu item created successfully:', {
          id: newItem.id,
          name: newItem.name,
          category: newItem.category,
        });
      }

      return newItem;

    } catch (error) {
      if (error instanceof MenuServiceError) {
        throw error;
      }

      console.error('Error creating menu item:', error);
      throw new MenuServiceError(
        'Failed to create menu item',
        'CREATE_ITEM_ERROR',
        500
      );
    }
  }

  /**
   * Update an existing menu item
   * 
   * Requirements:
   * - 4.4: Update menu item price and apply immediately
   * 
   * @param id - Menu item ID
   * @param updates - Partial menu item data to update
   * @returns Promise resolving to updated menu item
   * @throws MenuServiceError if validation fails or operation fails
   */
  async updateMenuItem(id: string, updates: UpdateMenuItem): Promise<MenuItem> {
    try {
      // Validate ID
      if (!id || id.trim().length === 0) {
        throw new MenuServiceError(
          'Menu item ID is required',
          'INVALID_ID',
          400
        );
      }

      // Get existing item
      const existingItem = await db.menuItems.get(id);
      if (!existingItem) {
        throw new MenuServiceError(
          `Menu item not found: ${id}`,
          'ITEM_NOT_FOUND',
          404
        );
      }

      // Validate updates
      if (updates.price !== undefined) {
        this.validatePrice(updates.price);
      }

      if (updates.stockLevel !== undefined) {
        this.validateStockLevel(updates.stockLevel);
      }

      if (updates.category !== undefined) {
        this.validateCategory(updates.category);
      }

      // Create updated item
      const updatedItem: MenuItem = {
        ...existingItem,
        ...updates,
        updatedAt: new Date(),
        version: existingItem.version + 1,
      };

      // Update local database first (offline-first)
      await db.menuItems.put(updatedItem);

      // If online, update Supabase
      if (this.isOnline()) {
        try {
          const { error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .update({
                name: updatedItem.name,
                category: updatedItem.category,
                price: updatedItem.price,
                stock_level: updatedItem.stockLevel,
                is_active: updatedItem.isActive,
                last_modified_by: updatedItem.lastModifiedBy,
                version: updatedItem.version,
                updated_at: updatedItem.updatedAt.toISOString(),
              })
              .eq('id', id);
          });

          if (error) {
            console.warn('Failed to update item in Supabase, queued for sync:', error);
            await this.queueForSync('update', updatedItem);
          }
        } catch (syncError) {
          console.warn('Failed to sync updated item:', syncError);
          await this.queueForSync('update', updatedItem);
        }
      } else {
        // Offline: queue for sync
        await this.queueForSync('update', updatedItem);
      }

      if (import.meta.env.DEV) {
        console.log('Menu item updated successfully:', {
          id: updatedItem.id,
          name: updatedItem.name,
          version: updatedItem.version,
        });
      }

      return updatedItem;

    } catch (error) {
      if (error instanceof MenuServiceError) {
        throw error;
      }

      console.error('Error updating menu item:', error);
      throw new MenuServiceError(
        'Failed to update menu item',
        'UPDATE_ITEM_ERROR',
        500
      );
    }
  }

  /**
   * Delete a menu item (soft delete by setting isActive to false)
   * 
   * @param id - Menu item ID
   * @returns Promise that resolves when deletion is complete
   * @throws MenuServiceError if operation fails
   */
  async deleteMenuItem(id: string): Promise<void> {
    try {
      // Validate ID
      if (!id || id.trim().length === 0) {
        throw new MenuServiceError(
          'Menu item ID is required',
          'INVALID_ID',
          400
        );
      }

      // Get existing item
      const existingItem = await db.menuItems.get(id);
      if (!existingItem) {
        throw new MenuServiceError(
          `Menu item not found: ${id}`,
          'ITEM_NOT_FOUND',
          404
        );
      }

      // Soft delete by setting isActive to false
      const updatedItem: MenuItem = {
        ...existingItem,
        isActive: false,
        updatedAt: new Date(),
        version: existingItem.version + 1,
      };

      // Update local database
      await db.menuItems.put(updatedItem);

      // If online, update Supabase
      if (this.isOnline()) {
        try {
          const { error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .update({
                is_active: false,
                version: updatedItem.version,
                updated_at: updatedItem.updatedAt.toISOString(),
              })
              .eq('id', id);
          });

          if (error) {
            console.warn('Failed to delete item in Supabase, queued for sync:', error);
            await this.queueForSync('update', updatedItem);
          }
        } catch (syncError) {
          console.warn('Failed to sync deleted item:', syncError);
          await this.queueForSync('update', updatedItem);
        }
      } else {
        // Offline: queue for sync
        await this.queueForSync('update', updatedItem);
      }

      if (import.meta.env.DEV) {
        console.log('Menu item deleted successfully:', {
          id: updatedItem.id,
          name: updatedItem.name,
        });
      }

    } catch (error) {
      if (error instanceof MenuServiceError) {
        throw error;
      }

      console.error('Error deleting menu item:', error);
      throw new MenuServiceError(
        'Failed to delete menu item',
        'DELETE_ITEM_ERROR',
        500
      );
    }
  }

  /**
   * Get all menu items grouped by category
   * 
   * Requirements:
   * - 4.1: Organize menu items into categories
   * - 4.8: Display menu items grouped by category
   * 
   * @returns Promise resolving to map of categories to menu items
   * @throws MenuServiceError if operation fails
   */
  async getMenuItemsByCategory(): Promise<Record<Category, MenuItem[]>> {
    try {
      const allItems = await this.getMenuItems();

      // Group items by category
      const grouped: Record<Category, MenuItem[]> = {
        [Category.SANDES]: [],
        [Category.TABUAS]: [],
        [Category.BATATAS]: [],
        [Category.DOCES]: [],
        [Category.BEBIDAS]: [],
      };

      for (const item of allItems) {
        if (item.isActive) {
          grouped[item.category].push(item);
        }
      }

      return grouped;

    } catch (error) {
      console.error('Error grouping items by category:', error);
      throw new MenuServiceError(
        'Failed to group menu items by category',
        'GROUP_BY_CATEGORY_ERROR',
        500
      );
    }
  }

  /**
   * Validate a menu item before creation
   * 
   * Requirements:
   * - 4.2: Require item name, category, price, and initial stock level
   * - 4.3: Validate that price is a positive decimal number
   * 
   * @param item - Menu item to validate
   * @throws MenuServiceError if validation fails
   */
  private validateMenuItem(item: CreateMenuItem): void {
    // Validate name
    if (!item.name || item.name.trim().length === 0) {
      throw new MenuServiceError(
        'Menu item name is required',
        'INVALID_NAME',
        400
      );
    }

    if (item.name.length > 100) {
      throw new MenuServiceError(
        'Menu item name must be 100 characters or less',
        'NAME_TOO_LONG',
        400
      );
    }

    // Validate category
    this.validateCategory(item.category);

    // Validate price
    this.validatePrice(item.price);

    // Validate stock level
    this.validateStockLevel(item.stockLevel);
  }

  /**
   * Validate a category value
   * @param category - Category to validate
   * @throws MenuServiceError if invalid
   */
  private validateCategory(category: Category): void {
    if (!Object.values(Category).includes(category)) {
      throw new MenuServiceError(
        `Invalid category. Must be one of: ${Object.values(Category).join(', ')}`,
        'INVALID_CATEGORY',
        400
      );
    }
  }

  /**
   * Validate a price value
   * 
   * Requirements:
   * - 4.3: Validate that price is a positive decimal number
   * 
   * @param price - Price to validate
   * @throws MenuServiceError if invalid
   */
  private validatePrice(price: number): void {
    if (typeof price !== 'number' || isNaN(price)) {
      throw new MenuServiceError(
        'Price must be a valid number',
        'INVALID_PRICE_TYPE',
        400
      );
    }

    if (price < 0) {
      throw new MenuServiceError(
        'Price must be greater than or equal to zero',
        'NEGATIVE_PRICE',
        400
      );
    }

    // Check for reasonable decimal precision (2 decimal places for currency)
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new MenuServiceError(
        'Price can have at most 2 decimal places',
        'INVALID_PRICE_PRECISION',
        400
      );
    }
  }

  /**
   * Validate a stock level value
   * @param stockLevel - Stock level to validate
   * @throws MenuServiceError if invalid
   */
  private validateStockLevel(stockLevel: number): void {
    if (typeof stockLevel !== 'number' || isNaN(stockLevel)) {
      throw new MenuServiceError(
        'Stock level must be a valid number',
        'INVALID_STOCK_TYPE',
        400
      );
    }

    if (stockLevel < 0) {
      throw new MenuServiceError(
        'Stock level must be greater than or equal to zero',
        'NEGATIVE_STOCK',
        400
      );
    }

    if (!Number.isInteger(stockLevel)) {
      throw new MenuServiceError(
        'Stock level must be an integer',
        'NON_INTEGER_STOCK',
        400
      );
    }
  }

  /**
   * Sync local database with remote data
   * @param remoteItems - Items from Supabase
   */
  private async syncLocalWithRemote(remoteItems: MenuItem[]): Promise<void> {
    try {
      // Use bulkPut for better performance
      await db.menuItems.bulkPut(remoteItems);
    } catch (error) {
      console.error('Error syncing local with remote:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Queue an operation for later synchronization
   * @param operation - Operation type (create, update, delete)
   * @param item - Menu item data
   */
  private async queueForSync(
    operation: 'create' | 'update' | 'delete',
    item: MenuItem
  ): Promise<void> {
    try {
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        entityType: 'menu_items',
        entityId: item.id,
        operation: operation as any,
        data: item,
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending' as any,
      });
    } catch (error) {
      console.error('Error queuing for sync:', error);
      // Non-critical error, don't throw
    }
  }
}

// Export singleton instance
export const menuService = new MenuService();

// Export for testing
export default menuService;
