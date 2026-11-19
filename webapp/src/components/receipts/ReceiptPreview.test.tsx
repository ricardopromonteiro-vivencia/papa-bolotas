/**
 * Tests for ReceiptPreview Component
 * 
 * Verifies:
 * - Component renders correctly with order data
 * - Receipt text is generated from order
 * - Print button triggers window.print()
 * - Complimentary orders display correctly
 * - Receipt formatting is preserved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReceiptPreview } from './ReceiptPreview';
import { Order, Category } from '@/types';

// Mock the receipt service
vi.mock('@/services/receipt.service', () => ({
  receiptService: {
    generateReceiptFromOrder: vi.fn((order: Order) => {
      // Simple mock receipt generation
      return `PAPA BOLOTAS\nPedido: #${order.orderNumber}\nTotal: ${order.total.toFixed(2)}€`;
    })
  }
}));

describe('ReceiptPreview', () => {
  const mockOrder: Order = {
    id: 'order-1',
    orderNumber: 1,
    sessionId: 'session-1',
    total: 15.50,
    isComplimentary: false,
    isCancelled: false,
    observations: 'Test observation',
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        menuItemId: 'menu-1',
        menuItemName: 'Sandes de Leitão',
        quantity: 2,
        unitPrice: 5.50,
        subtotal: 11.00
      },
      {
        id: 'item-2',
        orderId: 'order-1',
        menuItemId: 'menu-2',
        menuItemName: 'Coca-Cola',
        quantity: 1,
        unitPrice: 4.50,
        subtotal: 4.50
      }
    ],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15T14:30:00'),
    version: 1
  };

  const mockComplimentaryOrder: Order = {
    ...mockOrder,
    id: 'order-2',
    orderNumber: 2,
    isComplimentary: true,
    total: 0
  };

  beforeEach(() => {
    // Mock window.print
    window.print = vi.fn();
  });

  it('renders receipt preview with order data', () => {
    render(<ReceiptPreview order={mockOrder} />);
    
    // Check that receipt text is displayed
    const receiptText = screen.getByText(/PAPA BOLOTAS/);
    expect(receiptText).toBeInTheDocument();
  });

  it('displays order number in receipt', () => {
    render(<ReceiptPreview order={mockOrder} />);
    
    const receiptContent = screen.getByText(/Pedido: #1/);
    expect(receiptContent).toBeInTheDocument();
  });

  it('displays order total in receipt', () => {
    render(<ReceiptPreview order={mockOrder} />);
    
    const receiptContent = screen.getByText(/Total: 15\.50€/);
    expect(receiptContent).toBeInTheDocument();
  });

  it('renders print button', () => {
    render(<ReceiptPreview order={mockOrder} />);
    
    const printButton = screen.getByRole('button', { name: /Imprimir Talão/i });
    expect(printButton).toBeInTheDocument();
  });

  it('calls window.print when print button is clicked', () => {
    render(<ReceiptPreview order={mockOrder} />);
    
    const printButton = screen.getByRole('button', { name: /Imprimir Talão/i });
    fireEvent.click(printButton);
    
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('renders complimentary order correctly', () => {
    render(<ReceiptPreview order={mockComplimentaryOrder} />);
    
    // Receipt should still be displayed
    const receiptText = screen.getByText(/PAPA BOLOTAS/);
    expect(receiptText).toBeInTheDocument();
    
    // Total should be 0 for complimentary
    const receiptContent = screen.getByText(/Total: 0\.00€/);
    expect(receiptContent).toBeInTheDocument();
  });

  it('displays receipt in monospace font', () => {
    const { container } = render(<ReceiptPreview order={mockOrder} />);
    
    const preElement = container.querySelector('pre.receipt-text');
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveClass('font-mono');
  });

  it('preserves whitespace in receipt text', () => {
    const { container } = render(<ReceiptPreview order={mockOrder} />);
    
    const preElement = container.querySelector('pre.receipt-text');
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveClass('whitespace-pre');
  });

  it('renders receipt in a bordered container', () => {
    const { container } = render(<ReceiptPreview order={mockOrder} />);
    
    const receiptContainer = container.querySelector('.receipt-preview');
    expect(receiptContainer).toBeInTheDocument();
    expect(receiptContainer).toHaveClass('border');
    expect(receiptContainer).toHaveClass('bg-white');
  });

  it('updates receipt when order changes', () => {
    const { rerender } = render(<ReceiptPreview order={mockOrder} />);
    
    // Verify first order
    expect(screen.getByText(/Pedido: #1/)).toBeInTheDocument();
    
    // Update to second order
    const newOrder = { ...mockOrder, orderNumber: 5 };
    rerender(<ReceiptPreview order={newOrder} />);
    
    // Verify updated order number
    expect(screen.getByText(/Pedido: #5/)).toBeInTheDocument();
  });
});
