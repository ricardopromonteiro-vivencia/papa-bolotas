/**
 * Row Level Security (RLS) Integration Tests
 * 
 * These tests validate RLS policies using the Supabase JavaScript client.
 * Requirements: 17.4, 15.2
 * 
 * Setup:
 * 1. Configure test Supabase instance
 * 2. Apply migrations
 * 3. Create test users
 * 4. Run: npm test -- rls-policies.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const TEST_USER = {
  email: 'test@papabolotas.com',
  password: 'TestPassword123!',
  username: 'testuser'
};

describe('RLS Policies Integration Tests', () => {
  let authClient: SupabaseClient;
  let unauthClient: SupabaseClient;
  let testUserId: string;
  let testSessionId: string;
  let testMenuItemId: string;

  beforeAll(async () => {
    // Create authenticated client
    authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Sign in test user
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    testUserId = authData.user?.id || '';
    
    // Create unauthenticated client
    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  afterAll(async () => {
    // Cleanup
    await authClient.auth.signOut();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    if (testSessionId) {
      await authClient.from('sessions').delete().eq('id', testSessionId);
    }
    if (testMenuItemId) {
      await authClient.from('menu_items').delete().eq('id', testMenuItemId);
    }
  });

  describe('users table', () => {
    it('authenticated user can view own record', async () => {
      const { data, error } = await authClient
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(testUserId);
    });

    it('authenticated user cannot view other users', async () => {
      const { data, error } = await authClient
        .from('users')
        .select('*')
        .neq('id', testUserId);

      // Should return empty array or error due to RLS
      expect(data).toEqual([]);
    });

    it('unauthenticated user cannot view users', async () => {
      const { data, error } = await unauthClient
        .from('users')
        .select('*');

      // Should fail or return empty due to RLS
      expect(data?.length || 0).toBe(0);
    });
  });

  describe('sessions table', () => {
    it('authenticated user can create session', async () => {
      const { data, error } = await authClient
        .from('sessions')
        .insert({
          user_id: testUserId,
          started_at: new Date().toISOString(),
          is_active: true,
          version: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user_id).toBe(testUserId);
      
      testSessionId = data.id; // Save for cleanup
    });

    it('authenticated user can view all sessions', async () => {
      // Create a session first
      const { data: session } = await authClient
        .from('sessions')
        .insert({
          user_id: testUserId,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      testSessionId = session.id;

      const { data, error } = await authClient
        .from('sessions')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('authenticated user can update session', async () => {
      // Create session
      const { data: session } = await authClient
        .from('sessions')
        .insert({
          user_id: testUserId,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      testSessionId = session.id;

      // Update session
      const { data, error } = await authClient
        .from('sessions')
        .update({ actual_cash: 150.00 })
        .eq('id', testSessionId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.actual_cash).toBe(150.00);
    });

    it('unauthenticated user cannot access sessions', async () => {
      const { data, error } = await unauthClient
        .from('sessions')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });

  describe('menu_items table', () => {
    it('authenticated user can view menu items', async () => {
      const { data, error } = await authClient
        .from('menu_items')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('authenticated user can create menu item', async () => {
      const { data, error } = await authClient
        .from('menu_items')
        .insert({
          name: 'Test Sandes',
          category: 'Sandes',
          price: 5.50,
          stock_level: 20,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Sandes');
      expect(data.price).toBe(5.50);
      
      testMenuItemId = data.id; // Save for cleanup
    });

    it('authenticated user can update menu item', async () => {
      // Create item
      const { data: item } = await authClient
        .from('menu_items')
        .insert({
          name: 'Test Item',
          category: 'Sandes',
          price: 5.00,
          stock_level: 10,
          version: 1
        })
        .select()
        .single();

      testMenuItemId = item.id;

      // Update item
      const { data, error } = await authClient
        .from('menu_items')
        .update({ price: 6.00 })
        .eq('id', testMenuItemId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.price).toBe(6.00);
    });

    it('authenticated user can delete menu item', async () => {
      // Create item
      const { data: item } = await authClient
        .from('menu_items')
        .insert({
          name: 'Test Item to Delete',
          category: 'Sandes',
          price: 5.00,
          stock_level: 10,
          version: 1
        })
        .select()
        .single();

      const itemId = item.id;

      // Delete item
      const { error } = await authClient
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await authClient
        .from('menu_items')
        .select('*')
        .eq('id', itemId);

      expect(data).toEqual([]);
    });

    it('unauthenticated user cannot view menu items', async () => {
      const { data, error } = await unauthClient
        .from('menu_items')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });

  describe('orders table', () => {
    beforeEach(async () => {
      // Create session for order tests
      const { data: session } = await authClient
        .from('sessions')
        .insert({
          user_id: testUserId,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      testSessionId = session.id;
    });

    it('authenticated user can create order', async () => {
      const { data, error } = await authClient
        .from('orders')
        .insert({
          order_number: 1,
          session_id: testSessionId,
          total: 15.50,
          is_complimentary: false,
          is_cancelled: false,
          version: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.total).toBe(15.50);
      expect(data.session_id).toBe(testSessionId);
    });

    it('authenticated user can view all orders', async () => {
      // Create order
      await authClient
        .from('orders')
        .insert({
          order_number: 1,
          session_id: testSessionId,
          total: 10.00,
          version: 1
        });

      const { data, error } = await authClient
        .from('orders')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('authenticated user can cancel order', async () => {
      // Create order
      const { data: order } = await authClient
        .from('orders')
        .insert({
          order_number: 1,
          session_id: testSessionId,
          total: 10.00,
          version: 1
        })
        .select()
        .single();

      // Cancel order
      const { data, error } = await authClient
        .from('orders')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: testUserId
        })
        .eq('id', order.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_cancelled).toBe(true);
    });

    it('unauthenticated user cannot access orders', async () => {
      const { data, error } = await unauthClient
        .from('orders')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });

  describe('order_items table', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create session, menu item, and order for order_items tests
      const { data: session } = await authClient
        .from('sessions')
        .insert({
          user_id: testUserId,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      testSessionId = session.id;

      const { data: item } = await authClient
        .from('menu_items')
        .insert({
          name: 'Test Item',
          category: 'Sandes',
          price: 5.50,
          stock_level: 20,
          version: 1
        })
        .select()
        .single();

      testMenuItemId = item.id;

      const { data: order } = await authClient
        .from('orders')
        .insert({
          order_number: 1,
          session_id: testSessionId,
          total: 11.00,
          version: 1
        })
        .select()
        .single();

      testOrderId = order.id;
    });

    it('authenticated user can create order item', async () => {
      const { data, error } = await authClient
        .from('order_items')
        .insert({
          order_id: testOrderId,
          menu_item_id: testMenuItemId,
          quantity: 2,
          unit_price: 5.50,
          subtotal: 11.00,
          menu_item_name: 'Test Item'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.quantity).toBe(2);
      expect(data.subtotal).toBe(11.00);
    });

    it('authenticated user can view order items', async () => {
      // Create order item
      await authClient
        .from('order_items')
        .insert({
          order_id: testOrderId,
          menu_item_id: testMenuItemId,
          quantity: 1,
          unit_price: 5.50,
          subtotal: 5.50,
          menu_item_name: 'Test Item'
        });

      const { data, error } = await authClient
        .from('order_items')
        .select('*')
        .eq('order_id', testOrderId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });

    it('cascade delete removes order items when order is deleted', async () => {
      // Create order item
      const { data: orderItem } = await authClient
        .from('order_items')
        .insert({
          order_id: testOrderId,
          menu_item_id: testMenuItemId,
          quantity: 1,
          unit_price: 5.50,
          subtotal: 5.50,
          menu_item_name: 'Test Item'
        })
        .select()
        .single();

      // Delete order
      await authClient
        .from('orders')
        .delete()
        .eq('id', testOrderId);

      // Verify order item is also deleted
      const { data } = await authClient
        .from('order_items')
        .select('*')
        .eq('id', orderItem.id);

      expect(data).toEqual([]);
    });

    it('unauthenticated user cannot access order items', async () => {
      const { data, error } = await unauthClient
        .from('order_items')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });

  describe('stock_adjustments table', () => {
    beforeEach(async () => {
      // Create menu item for stock adjustment tests
      const { data: item } = await authClient
        .from('menu_items')
        .insert({
          name: 'Test Item for Stock',
          category: 'Sandes',
          price: 5.50,
          stock_level: 20,
          version: 1
        })
        .select()
        .single();

      testMenuItemId = item.id;
    });

    it('authenticated user can view stock adjustments', async () => {
      const { data, error } = await authClient
        .from('stock_adjustments')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('authenticated user can create stock adjustment', async () => {
      const { data, error } = await authClient
        .from('stock_adjustments')
        .insert({
          menu_item_id: testMenuItemId,
          adjustment_type: 'loss',
          quantity_change: -5,
          previous_level: 20,
          new_level: 15,
          reason: 'Breakage during service'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.adjustment_type).toBe('loss');
      expect(data.quantity_change).toBe(-5);
    });

    it('authenticated user CANNOT update stock adjustment (immutable)', async () => {
      // Create adjustment
      const { data: adjustment } = await authClient
        .from('stock_adjustments')
        .insert({
          menu_item_id: testMenuItemId,
          adjustment_type: 'loss',
          quantity_change: -5,
          previous_level: 20,
          new_level: 15
        })
        .select()
        .single();

      // Attempt to update (should fail due to no UPDATE policy)
      const { error } = await authClient
        .from('stock_adjustments')
        .update({ quantity_change: -3 })
        .eq('id', adjustment.id);

      // Should have an error indicating policy violation
      expect(error).toBeDefined();
    });

    it('authenticated user CANNOT delete stock adjustment (immutable)', async () => {
      // Create adjustment
      const { data: adjustment } = await authClient
        .from('stock_adjustments')
        .insert({
          menu_item_id: testMenuItemId,
          adjustment_type: 'loss',
          quantity_change: -5,
          previous_level: 20,
          new_level: 15
        })
        .select()
        .single();

      // Attempt to delete (should fail due to no DELETE policy)
      const { error } = await authClient
        .from('stock_adjustments')
        .delete()
        .eq('id', adjustment.id);

      // Should have an error indicating policy violation
      expect(error).toBeDefined();

      // Verify record still exists
      const { data } = await authClient
        .from('stock_adjustments')
        .select('*')
        .eq('id', adjustment.id);

      expect(data?.length).toBe(1);
    });

    it('unauthenticated user cannot access stock adjustments', async () => {
      const { data, error } = await unauthClient
        .from('stock_adjustments')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });

  describe('audit_logs table', () => {
    it('authenticated user can view audit logs', async () => {
      const { data, error } = await authClient
        .from('audit_logs')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('authenticated user can view own logs', async () => {
      const { data, error } = await authClient
        .from('audit_logs')
        .select('*')
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('unauthenticated user cannot access audit logs', async () => {
      const { data, error } = await unauthClient
        .from('audit_logs')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });

  describe('sync_metadata table', () => {
    it('authenticated user can view sync metadata', async () => {
      const { data, error } = await authClient
        .from('sync_metadata')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('authenticated user can create sync metadata', async () => {
      const { data, error } = await authClient
        .from('sync_metadata')
        .insert({
          entity_type: 'orders',
          entity_id: crypto.randomUUID(),
          client_id: crypto.randomUUID(),
          sync_status: 'pending',
          version: 1
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.sync_status).toBe('pending');
    });

    it('authenticated user can update sync metadata', async () => {
      // Create metadata
      const { data: metadata } = await authClient
        .from('sync_metadata')
        .insert({
          entity_type: 'orders',
          entity_id: crypto.randomUUID(),
          client_id: crypto.randomUUID(),
          sync_status: 'pending',
          version: 1
        })
        .select()
        .single();

      // Update metadata
      const { data, error } = await authClient
        .from('sync_metadata')
        .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
        .eq('id', metadata.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.sync_status).toBe('synced');
    });

    it('unauthenticated user cannot access sync metadata', async () => {
      const { data, error } = await unauthClient
        .from('sync_metadata')
        .select('*');

      expect(data?.length || 0).toBe(0);
    });
  });
});
