/**
 * IndexedDB Database Configuration with Dexie.js
 * 
 * This database mirrors the Supabase schema for offline data storage.
 * It provides local persistence for all core entities and sync operations.
 */

import Dexie, { Table } from 'dexie';
import type {
  User,
  MenuItem,
  Order,
  OrderItem,
  Session,
  StockAdjustment,
  AuditLog,
  SyncQueueItem,
} from '../types';

/**
 * Papa Bolotas Database
 * 
 * Provides offline-first storage with automatic schema versioning.
 * All data is stored locally and synchronized with Supabase when online.
 */
export class PapaBolotas extends Dexie {
  // Tables
  users!: Table<User, string>;
  menuItems!: Table<MenuItem, string>;
  orders!: Table<Order, string>;
  orderItems!: Table<OrderItem, string>;
  sessions!: Table<Session, string>;
  stockAdjustments!: Table<StockAdjustment, string>;
  auditLogs!: Table<AuditLog, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('PapaBolotas');

    // Database schema version 1
    this.version(1).stores({
      // Users table
      // Primary key: id
      // Indexes: username
      users: 'id, username, createdAt',

      // Menu items table
      // Primary key: id
      // Indexes: category, isActive, updatedAt (for sync and filtering)
      menuItems: 'id, category, isActive, updatedAt, name',

      // Orders table
      // Primary key: id
      // Indexes: sessionId (for session filtering), orderNumber (for display), 
      //          createdAt (for chronological sorting), isCancelled (for filtering)
      orders: 'id, sessionId, orderNumber, createdAt, isCancelled, isComplimentary',

      // Order items table (denormalized for historical accuracy)
      // Primary key: id
      // Indexes: orderId (for order lookups), menuItemId (for item tracking)
      orderItems: 'id, orderId, menuItemId',

      // Sessions table
      // Primary key: id
      // Indexes: userId (for user filtering), isActive (for current session),
      //          startedAt (for chronological sorting)
      sessions: 'id, userId, isActive, startedAt, endedAt',

      // Stock adjustments table (audit trail for stock changes)
      // Primary key: id
      // Indexes: menuItemId (for item history), createdAt (for chronological sorting),
      //          adjustmentType (for filtering by type)
      stockAdjustments: 'id, menuItemId, createdAt, adjustmentType',

      // Audit logs table (system activity tracking)
      // Primary key: id
      // Indexes: userId (for user filtering), entityType + entityId (for entity lookups),
      //          createdAt (for chronological sorting), action (for filtering)
      auditLogs: 'id, userId, [entityType+entityId], createdAt, action',

      // Sync queue table (offline change tracking)
      // Primary key: id
      // Indexes: status (for pending items), entityType (for entity filtering),
      //          timestamp (for chronological processing)
      syncQueue: 'id, status, entityType, timestamp, [entityType+entityId]',
    });
  }

  /**
   * Initialize the database with default data if needed
   * Called after first installation or version upgrade
   */
  async initialize(): Promise<void> {
    // Check if database is already initialized
    const userCount = await this.users.count();
    
    if (userCount === 0) {
      console.info('Initializing database for first use...');
      // Database is empty, can add seed data here if needed
      // For now, we'll let the application populate it
    }
  }

  /**
   * Clear all local data (use with caution)
   * Useful for logout or data reset scenarios
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.users.clear(),
      this.menuItems.clear(),
      this.orders.clear(),
      this.orderItems.clear(),
      this.sessions.clear(),
      this.stockAdjustments.clear(),
      this.auditLogs.clear(),
      this.syncQueue.clear(),
    ]);
  }

  /**
   * Clear only session-specific data
   * Preserves menu items and configuration
   */
  async clearSessionData(): Promise<void> {
    await Promise.all([
      this.orders.clear(),
      this.orderItems.clear(),
      this.sessions.where('isActive').equals(0).delete(),
      this.auditLogs.clear(),
    ]);
  }

  /**
   * Get database statistics for debugging
   */
  async getStats(): Promise<Record<string, number>> {
    const [
      usersCount,
      menuItemsCount,
      ordersCount,
      orderItemsCount,
      sessionsCount,
      stockAdjustmentsCount,
      auditLogsCount,
      syncQueueCount,
    ] = await Promise.all([
      this.users.count(),
      this.menuItems.count(),
      this.orders.count(),
      this.orderItems.count(),
      this.sessions.count(),
      this.stockAdjustments.count(),
      this.auditLogs.count(),
      this.syncQueue.count(),
    ]);

    return {
      users: usersCount,
      menuItems: menuItemsCount,
      orders: ordersCount,
      orderItems: orderItemsCount,
      sessions: sessionsCount,
      stockAdjustments: stockAdjustmentsCount,
      auditLogs: auditLogsCount,
      syncQueue: syncQueueCount,
    };
  }
}

/**
 * Global database instance
 * Use this throughout the application for consistency
 */
export const db = new PapaBolotas();

/**
 * Initialize the database on module load
 * This ensures the database is ready when the app starts
 */
db.initialize().catch((error) => {
  console.error('Failed to initialize database:', error);
});
