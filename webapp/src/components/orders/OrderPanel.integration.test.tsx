/**
 * OrderPanel Integration Tests
 * 
 * Integration tests demonstrating the complete order registration flow
 * with menu items, stock decrements, and order numbering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel, OrderPanelRef } from './OrderPanel';
import { MenuItem, Category } from '@/types';
import { db } from '@/lib/db';
import { createRef } from 'react';

describe('OrderPanel Integration Tests', () => {
  const mockSessionId = 'integration-session-123';
  const ref = createRef<OrderPanelRef>();

  const mockMenuItem: MenuItem = {
    id: 'item-integration-1',
    name: 'Sandes de Leitão',
    category: Category.SANDES,
    price: 4.50,
    stockLevel: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(async () => {
    // Clear database
    await db.menuItems.clear();
    await db.orders.clear();
    await db.orderItems.clear();
    await db.sessions.clear();

    // Add test menu item
    await db.menuItems.add(mockMenuItem);

    // Create test session
    await db.sessions.add({
      id: mockSessionId,
      userId: 'test-user',
      startedAt: new Date(),
      isActive: true,
      version: 1,
    });
  });

  afterEach(async () => {
    // Clean up
    await db.menuItems.clear();
    await db.orders.clear();
    await db.orderItems.clear();
    await db.sessions.clear();
  });

  it('should complete full order registration flow', async () => {
    const onOrderRegistered = vi.fn();

    render(
      <OrderPanel 
        ref={ref}
        sessionId={mockSessionId} 
        onOrderRegistered={onOrderRegistered}
      />
    );

    // Verify initial state
    expect(screen.getByText('No items in order')).toBeInTheDocument();
    expect(screen.getByText('€0.00')).toBeInTheDocument();

    // Add item using ref (simulates menu selection from task 8.2)
    ref.current?.addItem(mockMenuItem, 2);

    // Wait for UI to update
    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    // Verify item display
    expect(screen.getByText(/2 x €4.50/)).toBeInTheDocument();
    expect(screen.getByText('€9.00')).toBeInTheDocument(); // subtotal

    // Verify total
    expect(screen.getAllByText('€9.00')).toHaveLength(2); // subtotal and total

    // Add observations
    const textarea = screen.getByPlaceholderText(/Add any special instructions/i);
    fireEvent.change(textarea, { target: { value: 'Extra napkins please' } });

    // Register order
    const registerButton = screen.getByRole('button', { name: /^Register Order$/i });
    expect(registerButton).not.toBeDisabled();
    
    fireEvent.click(registerButton);

    // Wait for registration to complete
    await waitFor(() => {
      expect(screen.getByText(/Order #1 registered successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify order was registered
    expect(onOrderRegistered).toHaveBeenCalledTimes(1);
    const registeredOrder = onOrderRegistered.mock.calls[0][0];
    expect(registeredOrder.orderNumber).toBe(1);
    expect(registeredOrder.total).toBe(9.00);
    expect(registeredOrder.isComplimentary).toBe(false);
    expect(registeredOrder.observations).toBe('Extra napkins please');

    // Verify order panel was cleared
    await waitFor(() => {
      expect(screen.getByText('No items in order')).toBeInTheDocument();
    });
    expect(textarea).toHaveValue('');

    // Verify stock was decremented
    const updatedMenuItem = await db.menuItems.get(mockMenuItem.id);
    expect(updatedMenuItem?.stockLevel).toBe(18); // 20 - 2 = 18
  });

  it('should register complimentary order with zero total', async () => {
    const onOrderRegistered = vi.fn();

    render(
      <OrderPanel 
        ref={ref}
        sessionId={mockSessionId} 
        onOrderRegistered={onOrderRegistered}
      />
    );

    // Add item
    ref.current?.addItem(mockMenuItem, 1);

    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    // Register as complimentary
    const complimentaryButton = screen.getByRole('button', { name: /Register Complimentary/i });
    fireEvent.click(complimentaryButton);

    // Wait for registration
    await waitFor(() => {
      expect(screen.getByText(/Complimentary order #1 registered/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify complimentary order
    const registeredOrder = onOrderRegistered.mock.calls[0][0];
    expect(registeredOrder.total).toBe(0); // Total should be 0
    expect(registeredOrder.isComplimentary).toBe(true);

    // Verify stock was still decremented
    const updatedMenuItem = await db.menuItems.get(mockMenuItem.id);
    expect(updatedMenuItem?.stockLevel).toBe(19); // 20 - 1 = 19
  });

  it('should handle multiple orders with sequential numbering', async () => {
    const onOrderRegistered = vi.fn();

    render(
      <OrderPanel 
        ref={ref}
        sessionId={mockSessionId} 
        onOrderRegistered={onOrderRegistered}
      />
    );

    // Register first order
    ref.current?.addItem(mockMenuItem, 1);
    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });
    
    const registerButton = screen.getByRole('button', { name: /^Register Order$/i });
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Order #1 registered/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Wait for clear
    await waitFor(() => {
      expect(screen.getByText('No items in order')).toBeInTheDocument();
    });

    // Register second order
    ref.current?.addItem(mockMenuItem, 2);
    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });
    
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Order #2 registered/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify sequential numbering
    expect(onOrderRegistered).toHaveBeenCalledTimes(2);
    expect(onOrderRegistered.mock.calls[0][0].orderNumber).toBe(1);
    expect(onOrderRegistered.mock.calls[1][0].orderNumber).toBe(2);

    // Verify total stock decremented: 1 + 2 = 3
    const updatedMenuItem = await db.menuItems.get(mockMenuItem.id);
    expect(updatedMenuItem?.stockLevel).toBe(17); // 20 - 3 = 17
  });

  it('should remove items from order', async () => {
    render(
      <OrderPanel 
        ref={ref}
        sessionId={mockSessionId} 
      />
    );

    // Add multiple items
    ref.current?.addItem(mockMenuItem, 1);
    ref.current?.addItem(mockMenuItem, 2);

    await waitFor(() => {
      const items = screen.getAllByText('Sandes de Leitão');
      expect(items).toHaveLength(2);
    });

    // Verify total is 3 items * 4.50 = 13.50
    await waitFor(() => {
      expect(screen.getByText(/€13.50/)).toBeInTheDocument();
    });

    // Remove first item
    const removeButtons = screen.getAllByRole('button');
    const trashButton = removeButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );
    
    if (trashButton) {
      fireEvent.click(trashButton);
    }

    // Verify one item removed
    await waitFor(() => {
      const items = screen.getAllByText('Sandes de Leitão');
      expect(items).toHaveLength(1);
    });

    // Verify total updated to 2 * 4.50 = 9.00
    await waitFor(() => {
      expect(screen.getByText(/€9.00/)).toBeInTheDocument();
    });
  });

  it('should clear entire order', async () => {
    render(
      <OrderPanel 
        ref={ref}
        sessionId={mockSessionId} 
      />
    );

    // Add items
    ref.current?.addItem(mockMenuItem, 3);
    
    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    // Add observations
    const textarea = screen.getByPlaceholderText(/Add any special instructions/i);
    fireEvent.change(textarea, { target: { value: 'Test observation' } });

    // Clear order
    const clearButton = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearButton);

    // Verify everything cleared
    expect(screen.getByText('No items in order')).toBeInTheDocument();
    expect(screen.getByText('€0.00')).toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });
});
