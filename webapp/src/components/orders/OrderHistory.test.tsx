/**
 * OrderHistory Component Unit Tests
 * 
 * Tests the OrderHistory component including:
 * - Display of orders
 * - Complimentary order marking
 * - Cancelled order display with strikethrough
 * - Refresh functionality
 * - Order expansion/collapse
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderHistory } from './OrderHistory';
import { Order, OrderItem } from '@/types';
import * as services from '@/services';

// Mock the order service
vi.mock('@/services', () => ({
  orderService: {
    getSessionOrders: vi.fn(),
  },
}));

describe('OrderHistory', () => {
  const mockSessionId = 'session-123';
  
  const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => ({
    id: 'item-1',
    orderId: 'order-1',
    menuItemId: 'menu-1',
    menuItemName: 'Test Item',
    quantity: 2,
    unitPrice: 5.50,
    subtotal: 11.00,
    ...overrides,
  });

  const createMockOrder = (overrides?: Partial<Order>): Order => ({
    id: 'order-1',
    orderNumber: 1,
    sessionId: mockSessionId,
    total: 11.00,
    isComplimentary: false,
    isCancelled: false,
    observations: undefined,
    items: [createMockOrderItem()],
    createdAt: new Date('2024-01-01T12:00:00Z'),
    version: 1,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading indicator while fetching orders', () => {
      vi.mocked(services.orderService.getSessionOrders).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<OrderHistory sessionId={mockSessionId} />);

      expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no orders exist', async () => {
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
      });
    });

    it('displays order count of 0 orders', async () => {
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText(/0 orders in current session/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Display', () => {
    it('displays order number correctly', async () => {
      const order = createMockOrder({ orderNumber: 42 });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('#42')).toBeInTheDocument();
      });
    });

    it('displays order total correctly', async () => {
      const order = createMockOrder({ total: 25.50 });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('€25.50')).toBeInTheDocument();
      });
    });

    it('displays completed status for regular orders', async () => {
      const order = createMockOrder({ isComplimentary: false, isCancelled: false });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('displays multiple orders', async () => {
      const orders = [
        createMockOrder({ id: 'order-1', orderNumber: 1 }),
        createMockOrder({ id: 'order-2', orderNumber: 2 }),
        createMockOrder({ id: 'order-3', orderNumber: 3 }),
      ];
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue(orders);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText(/3 orders/i)).toBeInTheDocument();
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
        expect(screen.getByText('#3')).toBeInTheDocument();
      });
    });
  });

  describe('Complimentary Orders', () => {
    it('marks complimentary orders distinctly with badge', async () => {
      const order = createMockOrder({ 
        isComplimentary: true, 
        total: 0,
        isCancelled: false 
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('Complimentary')).toBeInTheDocument();
      });
    });

    it('displays total as 0 for complimentary orders', async () => {
      const order = createMockOrder({ 
        isComplimentary: true, 
        total: 0 
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('€0.00')).toBeInTheDocument();
      });
    });

    it('shows complimentary message when order is expanded', async () => {
      const user = userEvent.setup();
      const order = createMockOrder({ 
        isComplimentary: true, 
        total: 0 
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      // Click to expand order
      const orderHeader = screen.getByText('#1').closest('button');
      if (orderHeader) {
        await user.click(orderHeader);
      }

      await waitFor(() => {
        expect(screen.getByText(/this order was complimentary/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancelled Orders', () => {
    it('marks cancelled orders with badge', async () => {
      const order = createMockOrder({ 
        isCancelled: true, 
        total: 0,
        cancelledAt: new Date('2024-01-01T13:00:00Z')
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    it('applies strikethrough styling to cancelled orders', async () => {
      const order = createMockOrder({ 
        isCancelled: true, 
        total: 0 
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        const orderNumber = screen.getByText('#1');
        expect(orderNumber).toHaveClass('line-through');
      });
    });

    it('shows cancellation message when order is expanded', async () => {
      const user = userEvent.setup();
      const order = createMockOrder({ 
        isCancelled: true, 
        total: 0,
        cancelledAt: new Date('2024-01-01T13:00:00Z')
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      // Click to expand order
      const orderHeader = screen.getByText('#1').closest('button');
      if (orderHeader) {
        await user.click(orderHeader);
      }

      await waitFor(() => {
        expect(screen.getByText(/this order was cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Expansion', () => {
    it('expands order to show details when clicked', async () => {
      const user = userEvent.setup();
      const order = createMockOrder({
        items: [
          createMockOrderItem({ 
            menuItemName: 'Sandes Leitão',
            quantity: 2,
            unitPrice: 5.50,
            subtotal: 11.00
          }),
        ],
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      // Initially items should not be visible
      expect(screen.queryByText('Sandes Leitão')).not.toBeInTheDocument();

      // Click to expand
      const orderHeader = screen.getByText('#1').closest('button');
      if (orderHeader) {
        await user.click(orderHeader);
      }

      // Items should now be visible
      await waitFor(() => {
        expect(screen.getByText('Sandes Leitão')).toBeInTheDocument();
        expect(screen.getByText(/2 × €5.50/)).toBeInTheDocument();
      });
    });

    it('collapses order when clicked again', async () => {
      const user = userEvent.setup();
      const order = createMockOrder({
        items: [createMockOrderItem({ menuItemName: 'Test Item' })],
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      const orderHeader = screen.getByText('#1').closest('button');

      // Expand
      if (orderHeader) {
        await user.click(orderHeader);
      }
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      // Collapse
      if (orderHeader) {
        await user.click(orderHeader);
      }
      await waitFor(() => {
        expect(screen.queryByText('Test Item')).not.toBeInTheDocument();
      });
    });

    it('displays observations when order is expanded', async () => {
      const user = userEvent.setup();
      const order = createMockOrder({
        observations: 'Extra napkins please',
      });
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue([order]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      // Click to expand
      const orderHeader = screen.getByText('#1').closest('button');
      if (orderHeader) {
        await user.click(orderHeader);
      }

      await waitFor(() => {
        expect(screen.getByText('Extra napkins please')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes orders when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const initialOrders = [createMockOrder({ orderNumber: 1 })];
      const updatedOrders = [
        createMockOrder({ orderNumber: 1 }),
        createMockOrder({ id: 'order-2', orderNumber: 2 }),
      ];

      vi.mocked(services.orderService.getSessionOrders)
        .mockResolvedValueOnce(initialOrders)
        .mockResolvedValueOnce(updatedOrders);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText(/1 order/i)).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/2 orders/i)).toBeInTheDocument();
      });

      expect(services.orderService.getSessionOrders).toHaveBeenCalledTimes(2);
    });

    it('calls onRefresh callback when refresh completes', async () => {
      const user = userEvent.setup();
      const onRefreshMock = vi.fn();
      const orders = [createMockOrder()];
      
      vi.mocked(services.orderService.getSessionOrders).mockResolvedValue(orders);

      render(<OrderHistory sessionId={mockSessionId} onRefresh={onRefreshMock} />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      // Initial load should call onRefresh
      expect(onRefreshMock).toHaveBeenCalledWith(orders);

      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(onRefreshMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when loading fails', async () => {
      vi.mocked(services.orderService.getSessionOrders).mockRejectedValue(
        new Error('Network error')
      );

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading orders/i)).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      const user = userEvent.setup();
      vi.mocked(services.orderService.getSessionOrders)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([createMockOrder()]);

      render(<OrderHistory sessionId={mockSessionId} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });
    });
  });

  describe('Session Changes', () => {
    it('reloads orders when sessionId changes', async () => {
      const session1Orders = [createMockOrder({ orderNumber: 1 })];
      const session2Orders = [createMockOrder({ orderNumber: 101 })];

      vi.mocked(services.orderService.getSessionOrders)
        .mockResolvedValueOnce(session1Orders)
        .mockResolvedValueOnce(session2Orders);

      const { rerender } = render(<OrderHistory sessionId="session-1" />);

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
      });

      // Change session
      rerender(<OrderHistory sessionId="session-2" />);

      await waitFor(() => {
        expect(screen.getByText('#101')).toBeInTheDocument();
        expect(screen.queryByText('#1')).not.toBeInTheDocument();
      });

      expect(services.orderService.getSessionOrders).toHaveBeenCalledWith('session-1');
      expect(services.orderService.getSessionOrders).toHaveBeenCalledWith('session-2');
    });
  });
});
