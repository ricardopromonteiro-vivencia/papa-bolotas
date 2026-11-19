/**
 * CancelOrderDialog Component Tests
 * 
 * Tests the order cancellation dialog functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CancelOrderDialog } from './CancelOrderDialog';
import { orderService } from '@/services';
import { Order, Category, OrderItem } from '@/types';

// Mock the order service
vi.mock('@/services', () => ({
  orderService: {
    cancelOrder: vi.fn(),
    getOrder: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  XCircle: () => <div data-testid="xcircle-icon" />,
}));

describe('CancelOrderDialog', () => {
  const mockOrder: Order = {
    id: 'order-1',
    orderNumber: 42,
    sessionId: 'session-1',
    total: 25.50,
    isComplimentary: false,
    isCancelled: false,
    observations: 'Test order',
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        menuItemId: 'menu-1',
        menuItemName: 'Sandes de Leitão',
        quantity: 2,
        unitPrice: 5.50,
        subtotal: 11.00,
      },
      {
        id: 'item-2',
        orderId: 'order-1',
        menuItemId: 'menu-2',
        menuItemName: 'Coca Cola',
        quantity: 3,
        unitPrice: 2.50,
        subtotal: 7.50,
      },
    ] as OrderItem[],
    createdAt: new Date('2024-01-15T10:30:00'),
    version: 1,
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays order summary when dialog is open', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Check order details are displayed
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('€25.50')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Total items (2+3)
  });

  it('shows security code input field', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText(/Security Code/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('validates security code format (digits only)', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText(/Security Code/i) as HTMLInputElement;
    
    // Try entering non-digits
    fireEvent.change(input, { target: { value: 'abc123' } });
    
    // Should only have digits
    expect(input.value).toBe('123');
  });

  it('limits security code to 6 digits', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText(/Security Code/i) as HTMLInputElement;
    
    // Try entering more than 6 digits
    fireEvent.change(input, { target: { value: '1234567890' } });
    
    // Should be limited to 6 digits
    expect(input.value).toBe('123456');
  });

  it('shows error when submitting without security code', async () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel Order/i });
    
    // Button should be disabled when no code is entered
    expect(cancelButton).toBeDisabled();
  });

  it('enables cancel button when valid code is entered', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText(/Security Code/i);
    const cancelButton = screen.getByRole('button', { name: /Cancel Order/i });
    
    // Initially disabled
    expect(cancelButton).toBeDisabled();
    
    // Enter valid code (4+ digits)
    fireEvent.change(input, { target: { value: '1234' } });
    
    // Now enabled
    expect(cancelButton).not.toBeDisabled();
  });

  it('calls orderService.cancelOrder with correct parameters', async () => {
    const mockCancelledOrder = { ...mockOrder, isCancelled: true, total: 0 };
    vi.mocked(orderService.cancelOrder).mockResolvedValue(undefined);
    vi.mocked(orderService.getOrder).mockResolvedValue(mockCancelledOrder);

    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        userId="user-123"
      />
    );

    const input = screen.getByLabelText(/Security Code/i);
    const cancelButton = screen.getByRole('button', { name: /Cancel Order/i });
    
    // Enter security code
    fireEvent.change(input, { target: { value: '1234' } });
    
    // Click cancel order
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(orderService.cancelOrder).toHaveBeenCalledWith(
        'order-1',
        '1234',
        'user-123'
      );
    });
  });

  it('shows error message when cancellation fails', async () => {
    const errorMessage = 'Incorrect security code';
    vi.mocked(orderService.cancelOrder).mockRejectedValue(
      new Error(errorMessage)
    );

    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText(/Security Code/i);
    const cancelButton = screen.getByRole('button', { name: /Cancel Order/i });
    
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    // onSuccess should not have been called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onSuccess and closes dialog after successful cancellation', async () => {
    const mockCancelledOrder = { ...mockOrder, isCancelled: true, total: 0 };
    vi.mocked(orderService.cancelOrder).mockResolvedValue(undefined);
    vi.mocked(orderService.getOrder).mockResolvedValue(mockCancelledOrder);

    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText(/Security Code/i);
    const cancelButton = screen.getByRole('button', { name: /Cancel Order/i });
    
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCancelledOrder);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes dialog when Cancel button is clicked', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when order is null', () => {
    const { container } = render(
      <CancelOrderDialog
        order={null}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays stock restoration information', () => {
    render(
      <CancelOrderDialog
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Stock will be restored/i)).toBeInTheDocument();
    expect(
      screen.getByText(/All items from this order will be returned to inventory/i)
    ).toBeInTheDocument();
  });
});
