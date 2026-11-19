/**
 * Core TypeScript Type Definitions for Papa Bolotas Webapp
 * Defines all domain models, enums, and type guards for the POS system
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Menu item categories
 */
export enum Category {
  SANDES = 'Sandes',
  TABUAS = 'Tábuas',
  BATATAS = 'Batatas',
  DOCES = 'Doces',
  BEBIDAS = 'Bebidas'
}

/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = 'admin'
}

/**
 * Types of stock adjustments
 */
export enum AdjustmentType {
  MANUAL = 'manual',
  ORDER = 'order',
  CANCELLATION = 'cancellation',
  LOSS = 'loss'
}

/**
 * Synchronization queue operation types
 */
export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

/**
 * Current synchronization state
 */
export enum SyncState {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
  ERROR = 'error'
}

/**
 * Sync queue item status
 */
export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed'
}

/**
 * Order status (includes complimentary and cancelled flags)
 */
export enum OrderStatus {
  COMPLETED = 'completed',
  COMPLIMENTARY = 'complimentary',
  CANCELLED = 'cancelled'
}

/**
 * Audit log action types
 */
export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE_ORDER = 'create_order',
  CANCEL_ORDER = 'cancel_order',
  UPDATE_MENU_ITEM = 'update_menu_item',
  ADJUST_STOCK = 'adjust_stock',
  CLOSE_SESSION = 'close_session'
}

// ============================================================================
// USER AND AUTHENTICATION
// ============================================================================

/**
 * System user (admin only in MVP)
 */
export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Work session from login to cash register closure
 */
export interface Session {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  expectedCash?: number;
  actualCash?: number;
  discrepancy?: number;
  isActive: boolean;
  version: number;
}

/**
 * Authentication session with tokens
 */
export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// ============================================================================
// MENU AND STOCK
// ============================================================================

/**
 * Menu item representing a product for sale
 */
export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  stockLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: string;
  version: number;
}

/**
 * Current stock level for a menu item
 */
export interface StockLevel {
  itemId: string;
  itemName: string;
  currentLevel: number;
  lastAdjustedAt: Date;
}

/**
 * Record of a stock level change
 */
export interface StockAdjustment {
  id: string;
  menuItemId: string;
  adjustmentType: AdjustmentType;
  quantityChange: number;
  previousLevel: number;
  newLevel: number;
  reason?: string;
  createdBy?: string;
  createdAt: Date;
}

// ============================================================================
// ORDERS
// ============================================================================

/**
 * Individual item within an order
 */
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string; // Denormalized for historical accuracy
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Customer order
 */
export interface Order {
  id: string;
  orderNumber: number;
  sessionId: string;
  total: number;
  isComplimentary: boolean;
  isCancelled: boolean;
  observations?: string;
  items: OrderItem[];
  createdBy?: string;
  createdAt: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  version: number;
}

/**
 * Printable receipt for an order
 */
export interface Receipt {
  orderId: string;
  orderNumber: number;
  date: Date;
  items: OrderItem[];
  total: number;
  isComplimentary: boolean;
  observations?: string;
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Sales report for a session
 */
export interface SalesReport {
  sessionId: string;
  sessionStart: Date;
  sessionEnd?: Date;
  totalRevenue: number;
  completedOrders: number;
  complimentaryOrders: number;
  cancelledOrders: number;
  itemsSold: Array<{
    itemName: string;
    quantity: number;
    subtotal: number;
  }>;
}

// ============================================================================
// SYNCHRONIZATION
// ============================================================================

/**
 * Item in the synchronization queue
 */
export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: any;
  timestamp: Date;
  retryCount: number;
  status: SyncStatus;
  lastAttempt?: Date;
  error?: string;
}

/**
 * Result of a synchronization operation
 */
export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  conflicts: Conflict[];
  errors: Error[];
}

/**
 * Data conflict between local and remote
 */
export interface Conflict {
  entityType: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  resolution?: 'local' | 'remote' | 'manual';
}

/**
 * Current status of the sync queue
 */
export interface QueueStatus {
  pendingItems: number;
  lastSyncAt?: Date;
  state: SyncState;
}

// ============================================================================
// AUDIT
// ============================================================================

/**
 * Audit log entry for system actions
 */
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid User
 */
export function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    Object.values(UserRole).includes(obj.role as UserRole) &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if a value is a valid MenuItem
 */
export function isMenuItem(value: unknown): value is MenuItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Object.values(Category).includes(obj.category as Category) &&
    typeof obj.price === 'number' &&
    obj.price >= 0 &&
    typeof obj.stockLevel === 'number' &&
    obj.stockLevel >= 0 &&
    typeof obj.isActive === 'boolean' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.version === 'number'
  );
}

/**
 * Type guard to check if a value is a valid Order
 */
export function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.orderNumber === 'number' &&
    typeof obj.sessionId === 'string' &&
    typeof obj.total === 'number' &&
    obj.total >= 0 &&
    typeof obj.isComplimentary === 'boolean' &&
    typeof obj.isCancelled === 'boolean' &&
    Array.isArray(obj.items) &&
    obj.items.every(isOrderItem) &&
    obj.createdAt instanceof Date &&
    typeof obj.version === 'number'
  );
}

/**
 * Type guard to check if a value is a valid OrderItem
 */
export function isOrderItem(value: unknown): value is OrderItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.orderId === 'string' &&
    typeof obj.menuItemId === 'string' &&
    typeof obj.menuItemName === 'string' &&
    typeof obj.quantity === 'number' &&
    obj.quantity > 0 &&
    typeof obj.unitPrice === 'number' &&
    obj.unitPrice >= 0 &&
    typeof obj.subtotal === 'number' &&
    obj.subtotal >= 0
  );
}

/**
 * Type guard to check if a value is a valid Session
 */
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    obj.startedAt instanceof Date &&
    (obj.endedAt === undefined || obj.endedAt instanceof Date) &&
    typeof obj.isActive === 'boolean' &&
    typeof obj.version === 'number'
  );
}

/**
 * Type guard to check if a value is a valid StockAdjustment
 */
export function isStockAdjustment(value: unknown): value is StockAdjustment {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.menuItemId === 'string' &&
    Object.values(AdjustmentType).includes(obj.adjustmentType as AdjustmentType) &&
    typeof obj.quantityChange === 'number' &&
    typeof obj.previousLevel === 'number' &&
    typeof obj.newLevel === 'number' &&
    obj.createdAt instanceof Date
  );
}

/**
 * Type guard to check if a value is a valid Category
 */
export function isCategory(value: unknown): value is Category {
  return Object.values(Category).includes(value as Category);
}

/**
 * Type guard to check if a value is a valid SyncQueueItem
 */
export function isSyncQueueItem(value: unknown): value is SyncQueueItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.entityType === 'string' &&
    typeof obj.entityId === 'string' &&
    Object.values(SyncOperation).includes(obj.operation as SyncOperation) &&
    obj.timestamp instanceof Date &&
    typeof obj.retryCount === 'number' &&
    Object.values(SyncStatus).includes(obj.status as SyncStatus)
  );
}

// ============================================================================
// CONNECTION AND HEALTH
// ============================================================================

/**
 * Connection health check result
 */
export interface ConnectionHealth {
  isConnected: boolean;
  latency: number | null;
  error: Error | null;
}

/**
 * Connection status for UI display
 */
export interface ConnectionStatus {
  isOnline: boolean;
  isSupabaseConnected: boolean;
  lastChecked?: Date;
  latency?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type for creating a new entity (without id, timestamps, version)
 */
export type CreateMenuItem = Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'version'>;

/**
 * Type for updating an existing entity (partial fields)
 */
export type UpdateMenuItem = Partial<Omit<MenuItem, 'id' | 'createdAt' | 'version'>>;

/**
 * Type for creating a new order (before persistence)
 */
export type CreateOrder = Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'version' | 'items'> & {
  items: Omit<OrderItem, 'id' | 'orderId'>[];
};

/**
 * Type for stock adjustment request
 */
export type StockAdjustmentRequest = Omit<StockAdjustment, 'id' | 'createdAt'>;

/**
 * Type for database record with metadata (common fields)
 */
export interface DatabaseRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Re-export validation schemas and utilities for convenience
export * from './validation';
