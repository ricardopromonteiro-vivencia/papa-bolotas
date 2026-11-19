/**
 * Local Repository Layer for Offline Data Access
 * 
 * Provides clean APIs for data access operations wrapping the Dexie database.
 * Implements CRUD operations, query methods, and transaction support for all entities.
 */

import { db } from './db';
import {
  Category,
  AdjustmentType,
  SyncOperation,
  SyncStatus,
} from '../types';
import type {
  User,
  MenuItem,
  Order,
  OrderItem,
  Session,
  StockAdjustment,
  AuditLog,
  SyncQueueItem,
  CreateMenuItem,
  UpdateMenuItem,
  CreateOrder,
  StockAdjustmentRequest,
} from '../types';

// ============================================================================
// QUERY OPTIONS AND FILTERS
// ============================================================================

/**
 * Common query options for filtering and sorting
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter options for menu items
 */
export interface MenuItemFilter {
  category?: Category;
  isActive?: boolean;
  minStock?: number;
  maxStock?: number;
  searchTerm?: string;
}

/**
 * Filter options for orders
 */
export interface OrderFilter {
  sessionId?: string;
  isComplimentary?: boolean;
  isCancelled?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Filter options for stock adjustments
 */
export interface StockAdjustmentFilter {
  menuItemId?: string;
  adjustmentType?: AdjustmentType;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Filter options for audit logs
 */
export interface AuditLogFilter {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Filter options for sync queue items
 */
export interface SyncQueueFilter {
  status?: SyncStatus;
  entityType?: string;
  operation?: SyncOperation;
}

// ============================================================================
// LOCAL REPOSITORY CLASS
// ============================================================================

/**
 * LocalRepository provides offline-first data access APIs
 * 
 * All operations work with IndexedDB through Dexie.js.
 * Transactions ensure atomic operations for complex workflows.
 */
export class LocalRepository {
  // ==========================================================================
  // USER OPERATIONS
  // ==========================================================================

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User | undefined> {
    return await db.users.get(id);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.users.where('username').equals(username).first();
  }

  /**
   * Create a new user
   */
  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    await db.users.add(newUser);
    return newUser;
  }

  /**
   * Update an existing user
   */
  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined> {
    const existing = await db.users.get(id);
    if (!existing) return undefined;
    
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    await db.users.put(updated);
    return updated;
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    await db.users.delete(id);
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return await db.users.toArray();
  }

  // ==========================================================================
  // MENU ITEM OPERATIONS
  // ==========================================================================

  /**
   * Get menu item by ID
   */
  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    return await db.menuItems.get(id);
  }

  /**
   * Get all menu items with optional filtering
   */
  async getMenuItems(filter?: MenuItemFilter, options?: QueryOptions): Promise<MenuItem[]> {
    let collection = db.menuItems.toCollection();

    // Apply filters
    if (filter) {
      if (filter.category !== undefined) {
        collection = db.menuItems.where('category').equals(filter.category);
      }
      if (filter.isActive !== undefined) {
        collection = db.menuItems.where('isActive').equals(filter.isActive ? 1 : 0);
      }
    }

    // Get items
    let items = await collection.toArray();

    // Apply additional filters (not indexed)
    if (filter) {
      if (filter.minStock !== undefined) {
        items = items.filter(item => item.stockLevel >= filter.minStock!);
      }
      if (filter.maxStock !== undefined) {
        items = items.filter(item => item.stockLevel <= filter.maxStock!);
      }
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        items = items.filter(item => item.name.toLowerCase().includes(term));
      }
    }

    // Apply sorting
    if (options?.sortBy) {
      items.sort((a, b) => {
        const aVal = (a as any)[options.sortBy!];
        const bVal = (b as any)[options.sortBy!];
        const order = options.sortOrder === 'desc' ? -1 : 1;
        
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    }

    // Apply pagination
    if (options?.offset !== undefined) {
      items = items.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  /**
   * Get menu items by category
   */
  async getMenuItemsByCategory(category: Category): Promise<MenuItem[]> {
    return await db.menuItems.where('category').equals(category).toArray();
  }

  /**
   * Get active menu items only
   */
  async getActiveMenuItems(): Promise<MenuItem[]> {
    return await db.menuItems.where('isActive').equals(1).toArray();
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(item: CreateMenuItem): Promise<MenuItem> {
    const now = new Date();
    const newItem: MenuItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    
    await db.menuItems.add(newItem);
    return newItem;
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(id: string, updates: UpdateMenuItem): Promise<MenuItem | undefined> {
    const existing = await db.menuItems.get(id);
    if (!existing) return undefined;
    
    const updated: MenuItem = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
      version: existing.version + 1,
    };
    
    await db.menuItems.put(updated);
    return updated;
  }

  /**
   * Delete a menu item (soft delete by setting isActive = false)
   */
  async deleteMenuItem(id: string): Promise<void> {
    await this.updateMenuItem(id, { isActive: false });
  }

  /**
   * Hard delete a menu item (permanent removal)
   */
  async hardDeleteMenuItem(id: string): Promise<void> {
    await db.menuItems.delete(id);
  }

  /**
   * Get low stock items (stock level <= threshold)
   */
  async getLowStockItems(threshold: number = 5): Promise<MenuItem[]> {
    const items = await db.menuItems.toArray();
    return items.filter(item => item.stockLevel <= threshold && item.isActive);
  }

  // ==========================================================================
  // ORDER OPERATIONS
  // ==========================================================================

  /**
   * Get order by ID (includes order items)
   */
  async getOrder(id: string): Promise<Order | undefined> {
    const order = await db.orders.get(id);
    if (!order) return undefined;
    
    const items = await db.orderItems.where('orderId').equals(id).toArray();
    return { ...order, items };
  }

  /**
   * Get all orders with optional filtering
   */
  async getOrders(filter?: OrderFilter, options?: QueryOptions): Promise<Order[]> {
    let collection = db.orders.toCollection();

    // Apply indexed filters
    if (filter?.sessionId) {
      collection = db.orders.where('sessionId').equals(filter.sessionId);
    }

    // Get orders
    let orders = await collection.toArray();

    // Apply additional filters
    if (filter) {
      if (filter.isComplimentary !== undefined) {
        orders = orders.filter(o => o.isComplimentary === filter.isComplimentary);
      }
      if (filter.isCancelled !== undefined) {
        orders = orders.filter(o => o.isCancelled === filter.isCancelled);
      }
      if (filter.startDate) {
        orders = orders.filter(o => o.createdAt >= filter.startDate!);
      }
      if (filter.endDate) {
        orders = orders.filter(o => o.createdAt <= filter.endDate!);
      }
    }

    // Apply sorting (default: newest first)
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    orders.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const order = sortOrder === 'desc' ? -1 : 1;
      
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });

    // Apply pagination
    if (options?.offset !== undefined) {
      orders = orders.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      orders = orders.slice(0, options.limit);
    }

    // Load order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.orderItems.where('orderId').equals(order.id).toArray();
        return { ...order, items };
      })
    );

    return ordersWithItems;
  }

  /**
   * Get orders by session ID
   */
  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return await this.getOrders({ sessionId });
  }

  /**
   * Create a new order (atomic transaction)
   */
  async createOrder(orderData: CreateOrder, orderNumber: number): Promise<Order> {
    return await db.transaction('rw', [db.orders, db.orderItems], async () => {
      const now = new Date();
      const orderId = crypto.randomUUID();
      
      // Create order
      const order: Order = {
        ...orderData,
        id: orderId,
        orderNumber,
        createdAt: now,
        version: 1,
        items: [],
      };
      
      await db.orders.add(order);
      
      // Create order items
      const orderItems: OrderItem[] = orderData.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        orderId,
      }));
      
      await db.orderItems.bulkAdd(orderItems);
      
      return { ...order, items: orderItems };
    });
  }

  /**
   * Update an existing order
   */
  async updateOrder(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'items'>>): Promise<Order | undefined> {
    const existing = await db.orders.get(id);
    if (!existing) return undefined;
    
    const updated = {
      ...existing,
      ...updates,
      version: existing.version + 1,
    };
    
    await db.orders.put(updated);
    
    // Return order with items
    return await this.getOrder(id);
  }

  /**
   * Cancel an order (sets isCancelled flag and updates metadata)
   */
  async cancelOrder(id: string, cancelledBy: string): Promise<Order | undefined> {
    return await this.updateOrder(id, {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy,
    });
  }

  /**
   * Delete an order and its items (hard delete, use with caution)
   */
  async deleteOrder(id: string): Promise<void> {
    await db.transaction('rw', [db.orders, db.orderItems], async () => {
      await db.orderItems.where('orderId').equals(id).delete();
      await db.orders.delete(id);
    });
  }

  /**
   * Get the next order number for a session
   */
  async getNextOrderNumber(sessionId: string): Promise<number> {
    const orders = await db.orders.where('sessionId').equals(sessionId).toArray();
    if (orders.length === 0) return 1;
    
    const maxOrderNumber = Math.max(...orders.map(o => o.orderNumber));
    return maxOrderNumber + 1;
  }

  // ==========================================================================
  // SESSION OPERATIONS
  // ==========================================================================

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<Session | undefined> {
    return await db.sessions.get(id);
  }

  /**
   * Get all sessions
   */
  async getSessions(options?: QueryOptions): Promise<Session[]> {
    let sessions = await db.sessions.orderBy('startedAt').reverse().toArray();

    // Apply pagination
    if (options?.offset !== undefined) {
      sessions = sessions.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      sessions = sessions.slice(0, options.limit);
    }

    return sessions;
  }

  /**
   * Get active session for a user
   */
  async getActiveSession(userId: string): Promise<Session | undefined> {
    return await db.sessions
      .where('userId').equals(userId)
      .and(session => session.isActive)
      .first();
  }

  /**
   * Create a new session
   */
  async createSession(userId: string): Promise<Session> {
    const now = new Date();
    const newSession: Session = {
      id: crypto.randomUUID(),
      userId,
      startedAt: now,
      isActive: true,
      version: 1,
    };
    
    await db.sessions.add(newSession);
    return newSession;
  }

  /**
   * Update an existing session
   */
  async updateSession(id: string, updates: Partial<Omit<Session, 'id' | 'startedAt'>>): Promise<Session | undefined> {
    const existing = await db.sessions.get(id);
    if (!existing) return undefined;
    
    const updated: Session = {
      ...existing,
      ...updates,
      version: existing.version + 1,
    };
    
    await db.sessions.put(updated);
    return updated;
  }

  /**
   * Close a session (end work period)
   */
  async closeSession(
    id: string,
    expectedCash: number,
    actualCash: number
  ): Promise<Session | undefined> {
    const discrepancy = actualCash - expectedCash;
    
    return await this.updateSession(id, {
      endedAt: new Date(),
      expectedCash,
      actualCash,
      discrepancy,
      isActive: false,
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  // ==========================================================================
  // STOCK ADJUSTMENT OPERATIONS
  // ==========================================================================

  /**
   * Get stock adjustment by ID
   */
  async getStockAdjustment(id: string): Promise<StockAdjustment | undefined> {
    return await db.stockAdjustments.get(id);
  }

  /**
   * Get stock adjustments with optional filtering
   */
  async getStockAdjustments(filter?: StockAdjustmentFilter, options?: QueryOptions): Promise<StockAdjustment[]> {
    let collection = db.stockAdjustments.toCollection();

    // Apply indexed filters
    if (filter?.menuItemId) {
      collection = db.stockAdjustments.where('menuItemId').equals(filter.menuItemId);
    } else if (filter?.adjustmentType) {
      collection = db.stockAdjustments.where('adjustmentType').equals(filter.adjustmentType);
    }

    // Get adjustments
    let adjustments = await collection.toArray();

    // Apply date filters
    if (filter?.startDate) {
      adjustments = adjustments.filter(a => a.createdAt >= filter.startDate!);
    }
    if (filter?.endDate) {
      adjustments = adjustments.filter(a => a.createdAt <= filter.endDate!);
    }

    // Sort by date (newest first)
    adjustments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (options?.offset !== undefined) {
      adjustments = adjustments.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      adjustments = adjustments.slice(0, options.limit);
    }

    return adjustments;
  }

  /**
   * Get stock adjustments for a specific menu item
   */
  async getStockAdjustmentsByItem(menuItemId: string): Promise<StockAdjustment[]> {
    return await this.getStockAdjustments({ menuItemId });
  }

  /**
   * Create a stock adjustment and update menu item stock (atomic transaction)
   */
  async createStockAdjustment(adjustment: StockAdjustmentRequest): Promise<StockAdjustment> {
    return await db.transaction('rw', [db.stockAdjustments, db.menuItems], async () => {
      // Get current menu item
      const menuItem = await db.menuItems.get(adjustment.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item not found: ${adjustment.menuItemId}`);
      }

      // Create adjustment record
      const newAdjustment: StockAdjustment = {
        ...adjustment,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      
      await db.stockAdjustments.add(newAdjustment);

      // Update menu item stock
      const updatedMenuItem: MenuItem = {
        ...menuItem,
        stockLevel: adjustment.newLevel,
        updatedAt: new Date(),
        version: menuItem.version + 1,
      };
      
      await db.menuItems.put(updatedMenuItem);

      return newAdjustment;
    });
  }

  /**
   * Delete a stock adjustment
   */
  async deleteStockAdjustment(id: string): Promise<void> {
    await db.stockAdjustments.delete(id);
  }

  // ==========================================================================
  // AUDIT LOG OPERATIONS
  // ==========================================================================

  /**
   * Get audit log by ID
   */
  async getAuditLog(id: string): Promise<AuditLog | undefined> {
    return await db.auditLogs.get(id);
  }

  /**
   * Get audit logs with optional filtering
   */
  async getAuditLogs(filter?: AuditLogFilter, options?: QueryOptions): Promise<AuditLog[]> {
    let collection = db.auditLogs.toCollection();

    // Apply indexed filters
    if (filter?.userId) {
      collection = db.auditLogs.where('userId').equals(filter.userId);
    } else if (filter?.action) {
      collection = db.auditLogs.where('action').equals(filter.action);
    } else if (filter?.entityType && filter?.entityId) {
      collection = db.auditLogs.where('[entityType+entityId]').equals([filter.entityType, filter.entityId]);
    } else if (filter?.entityType) {
      collection = db.auditLogs.where('entityType').equals(filter.entityType);
    }

    // Get logs
    let logs = await collection.toArray();

    // Apply date filters
    if (filter?.startDate) {
      logs = logs.filter(log => log.createdAt >= filter.startDate!);
    }
    if (filter?.endDate) {
      logs = logs.filter(log => log.createdAt <= filter.endDate!);
    }

    // Sort by date (newest first)
    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (options?.offset !== undefined) {
      logs = logs.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(
    log: Omit<AuditLog, 'id' | 'createdAt'>
  ): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...log,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    await db.auditLogs.add(newLog);
    return newLog;
  }

  /**
   * Delete audit logs older than specified date
   */
  async deleteOldAuditLogs(beforeDate: Date): Promise<number> {
    const logs = await db.auditLogs.where('createdAt').below(beforeDate).toArray();
    await db.auditLogs.where('createdAt').below(beforeDate).delete();
    return logs.length;
  }

  // ==========================================================================
  // SYNC QUEUE OPERATIONS
  // ==========================================================================

  /**
   * Get sync queue item by ID
   */
  async getSyncQueueItem(id: string): Promise<SyncQueueItem | undefined> {
    return await db.syncQueue.get(id);
  }

  /**
   * Get sync queue items with optional filtering
   */
  async getSyncQueueItems(filter?: SyncQueueFilter, options?: QueryOptions): Promise<SyncQueueItem[]> {
    let collection = db.syncQueue.toCollection();

    // Apply indexed filters
    if (filter?.status) {
      collection = db.syncQueue.where('status').equals(filter.status);
    } else if (filter?.entityType) {
      collection = db.syncQueue.where('entityType').equals(filter.entityType);
    }

    // Get items
    let items = await collection.toArray();

    // Apply operation filter
    if (filter?.operation) {
      items = items.filter(item => item.operation === filter.operation);
    }

    // Sort by timestamp (oldest first for processing order)
    items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply pagination
    if (options?.offset !== undefined) {
      items = items.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  /**
   * Get pending sync queue items
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return await this.getSyncQueueItems({ status: SyncStatus.PENDING });
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    entityType: string,
    entityId: string,
    operation: SyncOperation,
    data: any
  ): Promise<SyncQueueItem> {
    const newItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      operation,
      data,
      timestamp: new Date(),
      retryCount: 0,
      status: SyncStatus.PENDING,
    };
    
    await db.syncQueue.add(newItem);
    return newItem;
  }

  /**
   * Update sync queue item status
   */
  async updateSyncQueueItem(
    id: string,
    updates: Partial<Omit<SyncQueueItem, 'id' | 'timestamp'>>
  ): Promise<SyncQueueItem | undefined> {
    const existing = await db.syncQueue.get(id);
    if (!existing) return undefined;
    
    const updated: SyncQueueItem = {
      ...existing,
      ...updates,
    };
    
    await db.syncQueue.put(updated);
    return updated;
  }

  /**
   * Mark sync queue item as synced
   */
  async markAsSynced(id: string): Promise<void> {
    await this.updateSyncQueueItem(id, { status: SyncStatus.SYNCED });
  }

  /**
   * Mark sync queue item as failed and increment retry count
   */
  async markAsFailed(id: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (!item) return;
    
    await this.updateSyncQueueItem(id, {
      status: SyncStatus.FAILED,
      retryCount: item.retryCount + 1,
    });
  }

  /**
   * Delete sync queue item
   */
  async deleteSyncQueueItem(id: string): Promise<void> {
    await db.syncQueue.delete(id);
  }

  /**
   * Delete all synced items from queue
   */
  async clearSyncedItems(): Promise<number> {
    const items = await db.syncQueue.where('status').equals(SyncStatus.SYNCED).toArray();
    await db.syncQueue.where('status').equals(SyncStatus.SYNCED).delete();
    return items.length;
  }

  // ==========================================================================
  // TRANSACTION SUPPORT
  // ==========================================================================

  /**
   * Execute multiple operations in a single transaction
   * 
   * Example:
   * ```ts
   * await repo.transaction(async () => {
   *   await repo.createOrder(orderData, orderNumber);
   *   await repo.createStockAdjustment(adjustment);
   * });
   * ```
   */
  async transaction<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    return await db.transaction('rw', db.tables, callback);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear all data from database (use with caution)
   */
  async clearAll(): Promise<void> {
    await db.clearAll();
  }

  /**
   * Clear only session-specific data
   */
  async clearSessionData(): Promise<void> {
    await db.clearSessionData();
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<Record<string, number>> {
    return await db.getStats();
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return db.isOpen();
  }
}

/**
 * Global repository instance
 * Use this throughout the application for consistency
 */
export const localRepository = new LocalRepository();
