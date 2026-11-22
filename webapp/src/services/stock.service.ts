/**
 * Stock Service
 * 
 * Handles all stock management operations including retrieval, manual adjustments,
 * automatic updates on orders/cancellations, and loss/breakage recording.
 * Implements offline-first architecture with automatic synchronization.
 * 
 * Requirements:
 * - 8.1: Maintain stock level for each menu item
 * - 8.3: Allow manual stock adjustments
 * - 8.4: Validate non-negative integer stock levels
 * - 8.6: Automatically decrement stock on order registration
 * - 8.7: Automatically increment stock on order cancellation
 * - 9.2: Record product losses
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { 
  StockLevel,
  StockAdjustment,
  AdjustmentType,
  tracksStock
} from '@/types';

/**
 * Custom error class for stock service failures
 */
export class StockServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'StockServiceError';
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
 * Stock Service
 * 
 * Provides comprehensive stock management with offline-first architecture.
 * All operations write to IndexedDB first, then sync to Supabase when online.
 */
export class StockService {
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
   * Validate stock level value
   * 
   * Requirement 8.4: Validate non-negative integers
   * 
   * @param stockLevel - Stock level to validate
   * @throws StockServiceError if validation fails
   */
  private validateStockLevel(stockLevel: number): void {
    if (typeof stockLevel !== 'number' || isNaN(stockLevel)) {
      throw new StockServiceError(
        'O nível de stock deve ser um número válido',
        'INVALID_STOCK_TYPE',
        400
      );
    }

    if (stockLevel < 0) {
      throw new StockServiceError(
        'O nível de stock não pode ser negativo',
        'NEGATIVE_STOCK',
        400
      );
    }

    if (!Number.isInteger(stockLevel)) {
      throw new StockServiceError(
        'O nível de stock deve ser um número inteiro',
        'NON_INTEGER_STOCK',
        400
      );
    }
  }

  /**
   * Record a stock adjustment in the database
   * 
   * @param menuItemId - Menu item ID
   * @param adjustmentType - Type of adjustment
   * @param quantityChange - Change in quantity (positive or negative)
   * @param previousLevel - Previous stock level
   * @param newLevel - New stock level
   * @param reason - Reason for adjustment
   * @param createdBy - User ID performing adjustment
   */
  private async recordAdjustment(
    menuItemId: string,
    adjustmentType: AdjustmentType,
    quantityChange: number,
    previousLevel: number,
    newLevel: number,
    reason?: string,
    createdBy?: string
  ): Promise<void> {
    try {
      const adjustment: StockAdjustment = {
        id: crypto.randomUUID(),
        menuItemId,
        adjustmentType,
        quantityChange,
        previousLevel,
        newLevel,
        reason,
        createdBy,
        createdAt: new Date(),
      };

      // Record in local database
      await db.stockAdjustments.add(adjustment);

      // If online, sync to Supabase
      if (this.isOnline()) {
        try {
          await this.retryWithBackoff(async () => {
            const { error } = await supabase
              .from('stock_adjustments')
              .insert({
                id: adjustment.id,
                menu_item_id: adjustment.menuItemId,
                adjustment_type: adjustment.adjustmentType,
                quantity_change: adjustment.quantityChange,
                previous_level: adjustment.previousLevel,
                new_level: adjustment.newLevel,
                reason: adjustment.reason,
                created_by: adjustment.createdBy,
                created_at: adjustment.createdAt.toISOString(),
              });

            if (error) throw error;
          });
        } catch (error) {
          console.warn('Failed to sync stock adjustment to Supabase:', error);
          
          // Queue for later sync
          await db.syncQueue.add({
            id: crypto.randomUUID(),
            entityType: 'stock_adjustments',
            entityId: adjustment.id,
            operation: 'create' as any,
            data: adjustment,
            timestamp: new Date(),
            retryCount: 0,
            status: 'pending' as any,
          });
        }
      } else {
        // Queue for sync when online
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          entityType: 'stock_adjustments',
          entityId: adjustment.id,
          operation: 'create' as any,
          data: adjustment,
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending' as any,
        });
      }
    } catch (error) {
      console.error('Error recording stock adjustment:', error);
      // Don't throw - adjustment recording is supplementary
    }
  }

  /**
   * Update menu item stock level in database
   * 
   * @param menuItemId - Menu item ID
   * @param newStockLevel - New stock level
   */
  private async updateMenuItemStock(
    menuItemId: string,
    newStockLevel: number
  ): Promise<void> {
    // Update in local database
    await db.menuItems.update(menuItemId, {
      stockLevel: newStockLevel,
      updatedAt: new Date(),
    });

    // If online, sync to Supabase
    if (this.isOnline()) {
      try {
        await this.retryWithBackoff(async () => {
          const { error } = await supabase
            .from('menu_items')
            .update({
              stock_level: newStockLevel,
              updated_at: new Date().toISOString(),
            })
            .eq('id', menuItemId);

          if (error) throw error;
        });
      } catch (error) {
        console.warn('Failed to sync stock update to Supabase:', error);
        
        // Queue for later sync
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          entityType: 'menu_items',
          entityId: menuItemId,
          operation: 'update' as any,
          data: { stockLevel: newStockLevel },
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending' as any,
        });
      }
    } else {
      // Queue for sync when online
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        entityType: 'menu_items',
        entityId: menuItemId,
        operation: 'update' as any,
        data: { stockLevel: newStockLevel },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending' as any,
      });
    }
  }

  /**
   * Get stock levels for all menu items
   * 
   * Requirement 8.1: Maintain stock level for each menu item
   * Requirement 8.2: Display current stock level
   * 
   * @returns Promise resolving to array of stock levels
   * @throws StockServiceError if operation fails
   */
  async getStockLevels(): Promise<StockLevel[]> {
    try {
      // Artigos ativos e com controlo de stock (os "sem stock" não aparecem na página de Stock)
      const menuItems = await db.menuItems
        .filter(item => item.isActive === true && tracksStock(item))
        .toArray();

      // Map to StockLevel format
      const stockLevels: StockLevel[] = menuItems.map(item => ({
        itemId: item.id,
        itemName: item.name,
        currentLevel: item.stockLevel,
        lastAdjustedAt: item.updatedAt,
      }));

      // If online, verify with Supabase and sync if needed
      if (this.isOnline()) {
        try {
          const { data, error } = await this.retryWithBackoff(async () => {
            return await supabase
              .from('menu_items')
              .select('id, name, stock_level, updated_at, track_stock')
              .eq('is_active', true);
          });

          if (error) {
            console.warn('Failed to fetch stock levels from Supabase:', error);
            return stockLevels;
          }

          if (data) {
            // Só os artigos com controlo de stock
            const tracked = data.filter(item => item.track_stock !== false);

            // Update local database with remote data if newer
            for (const remoteItem of tracked) {
              const localItem = menuItems.find(item => item.id === remoteItem.id);
              const remoteUpdatedAt = new Date(remoteItem.updated_at);
              
              if (!localItem || remoteUpdatedAt > localItem.updatedAt) {
                await db.menuItems.update(remoteItem.id, {
                  stockLevel: remoteItem.stock_level,
                  updatedAt: remoteUpdatedAt,
                });
              }
            }

            // Return fresh data from Supabase
            return tracked.map(item => ({
              itemId: item.id,
              itemName: item.name,
              currentLevel: item.stock_level,
              lastAdjustedAt: new Date(item.updated_at),
            }));
          }
        } catch (syncError) {
          console.warn('Stock level sync failed, using local data:', syncError);
        }
      }

      return stockLevels;

    } catch (error) {
      console.error('Error getting stock levels:', error);
      throw new StockServiceError(
        'Falha ao obter os níveis de stock',
        'GET_STOCK_ERROR',
        500
      );
    }
  }

  /**
   * Get stock level for a specific menu item
   * 
   * @param menuItemId - Menu item ID
   * @returns Promise resolving to stock level or null if not found
   * @throws StockServiceError if operation fails
   */
  async getStockLevel(menuItemId: string): Promise<StockLevel | null> {
    try {
      if (!menuItemId || typeof menuItemId !== 'string') {
        throw new StockServiceError(
          'ID do artigo do menu inválido',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      const menuItem = await db.menuItems.get(menuItemId);
      
      if (!menuItem) {
        return null;
      }

      return {
        itemId: menuItem.id,
        itemName: menuItem.name,
        currentLevel: menuItem.stockLevel,
        lastAdjustedAt: menuItem.updatedAt,
      };

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error getting stock level:', error);
      throw new StockServiceError(
        'Falha ao obter o nível de stock',
        'GET_STOCK_LEVEL_ERROR',
        500
      );
    }
  }

  /**
   * Manually adjust stock level to a specific value
   * 
   * Requirement 8.3: Allow manual stock adjustments
   * Requirement 8.4: Validate non-negative integers
   * 
   * @param menuItemId - Menu item ID
   * @param newLevel - New stock level (must be non-negative integer)
   * @param reason - Optional reason for adjustment
   * @param adjustedBy - Optional user ID performing adjustment
   * @throws StockServiceError if validation fails or operation fails
   */
  async adjustStock(
    menuItemId: string,
    newLevel: number,
    reason?: string,
    adjustedBy?: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!menuItemId || typeof menuItemId !== 'string') {
        throw new StockServiceError(
          'ID do artigo do menu inválido',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      this.validateStockLevel(newLevel);

      // Get current menu item
      const menuItem = await db.menuItems.get(menuItemId);
      
      if (!menuItem) {
        throw new StockServiceError(
          `Artigo do menu não encontrado: ${menuItemId}`,
          'MENU_ITEM_NOT_FOUND',
          404
        );
      }

      const previousLevel = menuItem.stockLevel;
      const quantityChange = newLevel - previousLevel;

      // Update stock level
      await this.updateMenuItemStock(menuItemId, newLevel);

      // Record adjustment
      await this.recordAdjustment(
        menuItemId,
        AdjustmentType.MANUAL,
        quantityChange,
        previousLevel,
        newLevel,
        reason,
        adjustedBy
      );

      if (import.meta.env.DEV) {
        console.log('Stock adjusted successfully:', {
          itemId: menuItemId,
          itemName: menuItem.name,
          previousLevel,
          newLevel,
          change: quantityChange,
        });
      }

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error adjusting stock:', error);
      throw new StockServiceError(
        'Falha ao ajustar o nível de stock',
        'ADJUST_STOCK_ERROR',
        500
      );
    }
  }

  /**
   * Decrement stock level by a specific quantity
   * 
   * Requirement 8.6: Automatically decrement stock on order registration
   * 
   * Note: This is called automatically by OrderService, but exposed for manual use if needed.
   * 
   * @param menuItemId - Menu item ID
   * @param quantity - Quantity to decrement (must be positive)
   * @param reason - Optional reason for decrement
   * @throws StockServiceError if validation fails or operation fails
   */
  async decrementStock(
    menuItemId: string,
    quantity: number,
    reason?: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!menuItemId || typeof menuItemId !== 'string') {
        throw new StockServiceError(
          'ID do artigo do menu inválido',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
        throw new StockServiceError(
          'A quantidade deve ser um número positivo',
          'INVALID_QUANTITY',
          400
        );
      }

      if (!Number.isInteger(quantity)) {
        throw new StockServiceError(
          'A quantidade deve ser um número inteiro',
          'NON_INTEGER_QUANTITY',
          400
        );
      }

      // Get current menu item
      const menuItem = await db.menuItems.get(menuItemId);
      
      if (!menuItem) {
        throw new StockServiceError(
          `Artigo do menu não encontrado: ${menuItemId}`,
          'MENU_ITEM_NOT_FOUND',
          404
        );
      }

      const previousLevel = menuItem.stockLevel;
      const newLevel = previousLevel - quantity;

      // Allow negative stock (as per requirements - just warn)
      if (newLevel < 0 && import.meta.env.DEV) {
        console.warn(`Stock level for ${menuItem.name} is now negative: ${newLevel}`);
      }

      // Update stock level
      await this.updateMenuItemStock(menuItemId, newLevel);

      // Record adjustment
      await this.recordAdjustment(
        menuItemId,
        AdjustmentType.ORDER,
        -quantity,
        previousLevel,
        newLevel,
        reason
      );

      if (import.meta.env.DEV) {
        console.log('Stock decremented successfully:', {
          itemId: menuItemId,
          itemName: menuItem.name,
          decrementBy: quantity,
          previousLevel,
          newLevel,
        });
      }

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error decrementing stock:', error);
      throw new StockServiceError(
        'Falha ao diminuir o nível de stock',
        'DECREMENT_STOCK_ERROR',
        500
      );
    }
  }

  /**
   * Increment stock level by a specific quantity
   * 
   * Requirement 8.7: Automatically increment stock on order cancellation
   * 
   * Note: This is called automatically by OrderService on cancellation, but exposed for manual use.
   * 
   * @param menuItemId - Menu item ID
   * @param quantity - Quantity to increment (must be positive)
   * @param reason - Optional reason for increment
   * @throws StockServiceError if validation fails or operation fails
   */
  async incrementStock(
    menuItemId: string,
    quantity: number,
    reason?: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!menuItemId || typeof menuItemId !== 'string') {
        throw new StockServiceError(
          'ID do artigo do menu inválido',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
        throw new StockServiceError(
          'A quantidade deve ser um número positivo',
          'INVALID_QUANTITY',
          400
        );
      }

      if (!Number.isInteger(quantity)) {
        throw new StockServiceError(
          'A quantidade deve ser um número inteiro',
          'NON_INTEGER_QUANTITY',
          400
        );
      }

      // Get current menu item
      const menuItem = await db.menuItems.get(menuItemId);
      
      if (!menuItem) {
        throw new StockServiceError(
          `Artigo do menu não encontrado: ${menuItemId}`,
          'MENU_ITEM_NOT_FOUND',
          404
        );
      }

      const previousLevel = menuItem.stockLevel;
      const newLevel = previousLevel + quantity;

      // Validate new level is non-negative
      this.validateStockLevel(newLevel);

      // Update stock level
      await this.updateMenuItemStock(menuItemId, newLevel);

      // Record adjustment
      await this.recordAdjustment(
        menuItemId,
        AdjustmentType.CANCELLATION,
        quantity,
        previousLevel,
        newLevel,
        reason
      );

      if (import.meta.env.DEV) {
        console.log('Stock incremented successfully:', {
          itemId: menuItemId,
          itemName: menuItem.name,
          incrementBy: quantity,
          previousLevel,
          newLevel,
        });
      }

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error incrementing stock:', error);
      throw new StockServiceError(
        'Falha ao aumentar o nível de stock',
        'INCREMENT_STOCK_ERROR',
        500
      );
    }
  }

  /**
   * Record product loss or breakage
   * 
   * Requirements:
   * - 9.2: Require menu item and quantity
   * - 9.3: Validate positive integer quantity
   * - 9.5: Decrement stock level
   * - 9.6: Log loss event with timestamp
   * - 9.7: Sync to Supabase when online
   * 
   * @param menuItemId - Menu item ID
   * @param quantity - Quantity lost (must be positive integer)
   * @param reason - Reason for loss (e.g., "Breakage", "Expired")
   * @param recordedBy - Optional user ID recording the loss
   * @throws StockServiceError if validation fails or operation fails
   */
  async recordLoss(
    menuItemId: string,
    quantity: number,
    reason: string,
    recordedBy?: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!menuItemId || typeof menuItemId !== 'string') {
        throw new StockServiceError(
          'ID do artigo do menu inválido',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      // Requirement 9.3: Validate positive integer
      if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
        throw new StockServiceError(
          'A quantidade perdida deve ser um número positivo',
          'INVALID_LOSS_QUANTITY',
          400
        );
      }

      if (!Number.isInteger(quantity)) {
        throw new StockServiceError(
          'A quantidade perdida deve ser um número inteiro',
          'NON_INTEGER_QUANTITY',
          400
        );
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new StockServiceError(
          'O motivo da perda é obrigatório',
          'MISSING_REASON',
          400
        );
      }

      // Get current menu item
      const menuItem = await db.menuItems.get(menuItemId);
      
      if (!menuItem) {
        throw new StockServiceError(
          `Artigo do menu não encontrado: ${menuItemId}`,
          'MENU_ITEM_NOT_FOUND',
          404
        );
      }

      const previousLevel = menuItem.stockLevel;
      const newLevel = previousLevel - quantity;

      // Requirement 9.4: Warn if quantity exceeds current stock
      if (quantity > previousLevel && import.meta.env.DEV) {
        console.warn(
          `Loss quantity (${quantity}) exceeds current stock level (${previousLevel}) for ${menuItem.name}. ` +
          `Stock will be negative: ${newLevel}`
        );
      }

      // Requirement 9.5: Decrement stock level
      await this.updateMenuItemStock(menuItemId, newLevel);

      // Requirement 9.6: Log loss event with timestamp
      await this.recordAdjustment(
        menuItemId,
        AdjustmentType.LOSS,
        -quantity,
        previousLevel,
        newLevel,
        reason,
        recordedBy
      );

      if (import.meta.env.DEV) {
        console.log('Loss recorded successfully:', {
          itemId: menuItemId,
          itemName: menuItem.name,
          quantity,
          reason,
          previousLevel,
          newLevel,
        });
      }

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error recording loss:', error);
      throw new StockServiceError(
        'Falha ao registar a perda do produto',
        'RECORD_LOSS_ERROR',
        500
      );
    }
  }

  /**
   * Get stock adjustment history for a menu item
   * 
   * @param menuItemId - Menu item ID
   * @param limit - Optional limit on number of records to return
   * @returns Promise resolving to array of stock adjustments
   * @throws StockServiceError if operation fails
   */
  async getAdjustmentHistory(
    menuItemId: string,
    limit?: number
  ): Promise<StockAdjustment[]> {
    try {
      if (!menuItemId || typeof menuItemId !== 'string') {
        throw new StockServiceError(
          'ID do artigo do menu inválido',
          'INVALID_MENU_ITEM_ID',
          400
        );
      }

      let query = db.stockAdjustments
        .where('menuItemId')
        .equals(menuItemId)
        .reverse()
        .sortBy('createdAt');

      const adjustments = await query;

      if (limit && limit > 0) {
        return adjustments.slice(0, limit);
      }

      return adjustments;

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error getting adjustment history:', error);
      throw new StockServiceError(
        'Falha ao obter o histórico de ajustes',
        'GET_HISTORY_ERROR',
        500
      );
    }
  }

  /**
   * Get all stock adjustments within a date range
   * 
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to array of stock adjustments
   * @throws StockServiceError if operation fails
   */
  async getAdjustmentsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<StockAdjustment[]> {
    try {
      if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        throw new StockServiceError(
          'Intervalo de datas inválido',
          'INVALID_DATE_RANGE',
          400
        );
      }

      if (startDate > endDate) {
        throw new StockServiceError(
          'A data de início deve ser anterior à data de fim',
          'INVALID_DATE_ORDER',
          400
        );
      }

      const adjustments = await db.stockAdjustments
        .where('createdAt')
        .between(startDate, endDate, true, true)
        .reverse()
        .sortBy('createdAt');

      return adjustments;

    } catch (error) {
      if (error instanceof StockServiceError) {
        throw error;
      }

      console.error('Error getting adjustments by date range:', error);
      throw new StockServiceError(
        'Falha ao obter os ajustes por intervalo de datas',
        'GET_ADJUSTMENTS_BY_DATE_ERROR',
        500
      );
    }
  }
}

/**
 * Global stock service instance
 */
export const stockService = new StockService();

export default stockService;
