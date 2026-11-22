/**
 * Real-time Subscription Service
 * 
 * Subscribes to Supabase real-time channels for remote data changes.
 * Updates local IndexedDB when remote changes occur from other devices.
 * 
 * Requirements:
 * - 17.8: Real-time updates from other devices
 * - 3.8: Update local data on remote changes
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Real-time event types
 */
export enum RealtimeEventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ERROR = 'error'
}

/**
 * Real-time event data
 */
export interface RealtimeEvent {
  type: RealtimeEventType;
  table: string;
  payload?: any;
  timestamp: Date;
}

/**
 * Real-time event listener
 */
export type RealtimeEventListener = (event: RealtimeEvent) => void;

/**
 * Custom error class for real-time subscription failures
 */
export class RealtimeSubscriptionError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'RealtimeSubscriptionError';
  }
}

/**
 * Real-time Subscription Service
 * 
 * Manages real-time subscriptions to Supabase and updates local IndexedDB.
 */
export class RealtimeSubscriptionService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<RealtimeEventType, Set<RealtimeEventListener>> = new Map();
  private isSubscribed: boolean = false;

  constructor() {
    // Initialize event listener map
    Object.values(RealtimeEventType).forEach(type => {
      this.listeners.set(type, new Set());
    });
  }

  /**
   * Subscribe to real-time updates for all tables
   * 
   * Requirement 17.8: Real-time updates from other devices
   */
  async subscribeToAll(): Promise<void> {
    if (this.isSubscribed) {
      if (import.meta.env.DEV) {
        console.warn('Already subscribed to real-time updates');
      }
      return;
    }

    try {
      // Subscribe to menu items changes
      await this.subscribeToTable('menu_items', 'menuItems');

      // Subscribe to orders changes
      await this.subscribeToTable('orders', 'orders');

      // Subscribe to sessions changes
      await this.subscribeToTable('sessions', 'sessions');

      // Subscribe to stock adjustments changes
      await this.subscribeToTable('stock_adjustments', 'stockAdjustments');

      this.isSubscribed = true;

      this.emitEvent({
        type: RealtimeEventType.CONNECTED,
        table: 'all',
        timestamp: new Date()
      });

      if (import.meta.env.DEV) {
        console.log('Subscribed to all real-time updates');
      }
    } catch (error) {
      throw new RealtimeSubscriptionError(
        `Falha ao subscrever as atualizações em tempo real: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'SUBSCRIPTION_FAILED'
      );
    }
  }

  /**
   * Subscribe to real-time updates for specific table
   * 
   * @param tableName - Supabase table name
   * @param localTableName - Local IndexedDB table name
   */
  private async subscribeToTable(
    tableName: string,
    localTableName: keyof typeof db
  ): Promise<void> {
    // Create channel for this table
    const channel = supabase.channel(`${tableName}-changes`);

    // Subscribe to INSERT events
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: tableName
      },
      (payload) => this.handleInsert(localTableName, payload)
    );

    // Subscribe to UPDATE events
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: tableName
      },
      (payload) => this.handleUpdate(localTableName, payload)
    );

    // Subscribe to DELETE events
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: tableName
      },
      (payload) => this.handleDelete(localTableName, payload)
    );

    // Subscribe to channel
    await channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (import.meta.env.DEV) {
          console.log(`Subscribed to ${tableName} real-time updates`);
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to ${tableName}`);
        this.emitEvent({
          type: RealtimeEventType.ERROR,
          table: tableName,
          payload: { error: 'Channel subscription error' },
          timestamp: new Date()
        });
      }
    });

    // Store channel
    this.channels.set(tableName, channel);
  }

  /**
   * Handle INSERT event from Supabase
   * 
   * Requirement 3.8: Update local IndexedDB on remote changes
   */
  private async handleInsert(
    localTableName: keyof typeof db,
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    try {
      const newRecord = payload.new as any;

      if (!newRecord || !newRecord.id) {
        console.warn('Invalid INSERT payload:', payload);
        return;
      }

      // Check if record already exists locally
      const existingRecord = await (db[localTableName] as any).get(newRecord.id);

      if (existingRecord) {
        if (import.meta.env.DEV) {
          console.log(`Record already exists locally: ${localTableName}/${newRecord.id}`);
        }
        return;
      }

      // Convert date strings to Date objects
      const record = this.convertDates(newRecord);

      // Add to local database
      await (db[localTableName] as any).add(record);

      this.emitEvent({
        type: RealtimeEventType.INSERT,
        table: localTableName,
        payload: record,
        timestamp: new Date()
      });

      if (import.meta.env.DEV) {
        console.log(`Remote INSERT synced locally: ${localTableName}/${newRecord.id}`);
      }
    } catch (error) {
      console.error('Error handling INSERT:', error);
      this.emitEvent({
        type: RealtimeEventType.ERROR,
        table: localTableName,
        payload: { error: 'Failed to handle INSERT', details: error },
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle UPDATE event from Supabase
   * 
   * Requirement 3.8: Update local IndexedDB on remote changes
   */
  private async handleUpdate(
    localTableName: keyof typeof db,
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    try {
      const updatedRecord = payload.new as any;

      if (!updatedRecord || !updatedRecord.id) {
        console.warn('Invalid UPDATE payload:', payload);
        return;
      }

      // Convert date strings to Date objects
      const record = this.convertDates(updatedRecord);

      // Update local database
      await (db[localTableName] as any).put(record);

      this.emitEvent({
        type: RealtimeEventType.UPDATE,
        table: localTableName,
        payload: record,
        timestamp: new Date()
      });

      if (import.meta.env.DEV) {
        console.log(`Remote UPDATE synced locally: ${localTableName}/${updatedRecord.id}`);
      }
    } catch (error) {
      console.error('Error handling UPDATE:', error);
      this.emitEvent({
        type: RealtimeEventType.ERROR,
        table: localTableName,
        payload: { error: 'Failed to handle UPDATE', details: error },
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle DELETE event from Supabase
   * 
   * Requirement 3.8: Update local IndexedDB on remote changes
   */
  private async handleDelete(
    localTableName: keyof typeof db,
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    try {
      const deletedRecord = payload.old as any;

      if (!deletedRecord || !deletedRecord.id) {
        console.warn('Invalid DELETE payload:', payload);
        return;
      }

      // Delete from local database
      await (db[localTableName] as any).delete(deletedRecord.id);

      this.emitEvent({
        type: RealtimeEventType.DELETE,
        table: localTableName,
        payload: { id: deletedRecord.id },
        timestamp: new Date()
      });

      if (import.meta.env.DEV) {
        console.log(`Remote DELETE synced locally: ${localTableName}/${deletedRecord.id}`);
      }
    } catch (error) {
      console.error('Error handling DELETE:', error);
      this.emitEvent({
        type: RealtimeEventType.ERROR,
        table: localTableName,
        payload: { error: 'Failed to handle DELETE', details: error },
        timestamp: new Date()
      });
    }
  }

  /**
   * Convert date string fields to Date objects
   * 
   * @param record - Record with potential date strings
   * @returns Record with Date objects
   */
  private convertDates(record: any): any {
    const dateFields = ['createdAt', 'updatedAt', 'startedAt', 'endedAt', 'cancelledAt'];
    const converted = { ...record };

    dateFields.forEach(field => {
      if (converted[field] && typeof converted[field] === 'string') {
        converted[field] = new Date(converted[field]);
      }
    });

    return converted;
  }

  /**
   * Unsubscribe from all real-time updates
   */
  async unsubscribeFromAll(): Promise<void> {
    if (!this.isSubscribed) {
      return;
    }

    // Unsubscribe from all channels
    for (const [tableName, channel] of this.channels.entries()) {
      await supabase.removeChannel(channel);
      if (import.meta.env.DEV) {
        console.log(`Unsubscribed from ${tableName}`);
      }
    }

    this.channels.clear();
    this.isSubscribed = false;

    this.emitEvent({
      type: RealtimeEventType.DISCONNECTED,
      table: 'all',
      timestamp: new Date()
    });

    if (import.meta.env.DEV) {
      console.log('Unsubscribed from all real-time updates');
    }
  }

  /**
   * Check if subscribed to real-time updates
   */
  getIsSubscribed(): boolean {
    return this.isSubscribed;
  }

  /**
   * Get number of active channels
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Add event listener
   */
  addEventListener(type: RealtimeEventType, listener: RealtimeEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: RealtimeEventType, listener: RealtimeEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: RealtimeEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in realtime event listener:', error);
        }
      });
    }
  }
}

/**
 * Global real-time subscription service instance
 */
export const realtimeSubscriptionService = new RealtimeSubscriptionService();

export default realtimeSubscriptionService;
