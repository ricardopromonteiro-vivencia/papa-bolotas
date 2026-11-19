/**
 * StockAdjustmentForm Component Tests
 * 
 * Tests for the stock adjustment form component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StockAdjustmentForm } from './StockAdjustmentForm';
import { Category } from '@/types';
import * as stockServiceModule from '@/services/stock.service';

// Mock the stock service
vi.mock('@/services/stock.service', () => ({
  stockService: {
    adjustStock: vi.fn(),
  },
  StockServiceError: class StockServiceError extends Error {
    constructor(message: string, public code?: string, public statusCode?: number) {
      super(message);
      this.name = 'StockServiceError';
    }
  },
}));

describe('StockAdjustmentForm', () => {
  const mockItem = {
    id: '1',
    name: 'Test Item',
    category: Category.SANDES,
    price: 5.0,
    stockLevel: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with current stock level', () => {
    render(<StockAdjustmentForm item={mockItem} />);
    
    expect(screen.getByText(/Test Item/i)).toBeInTheDocument();
    expect(screen.getByText(/Stock Atual:/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('validates non-negative integer input', async () => {
    render(<StockAdjustmentForm item={mockItem} />);
    
    const input = screen.getByLabelText(/Novo Nível de Stock/i);
    const submitButton = screen.getByRole('button', { name: /Guardar/i });

    // Test negative number
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText(/não pode ser negativo/i)).toBeInTheDocument();
    });

    // Clear and test decimal number
    fireEvent.change(input, { target: { value: '10.5' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText(/número inteiro/i)).toBeInTheDocument();
    });
  });

  it('submits valid stock adjustment', async () => {
    const mockAdjustStock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(stockServiceModule.stockService.adjustStock).mockImplementation(mockAdjustStock);
    
    const onSuccess = vi.fn();
    render(<StockAdjustmentForm item={mockItem} onSuccess={onSuccess} />);
    
    const input = screen.getByLabelText(/Novo Nível de Stock/i);
    const submitButton = screen.getByRole('button', { name: /Guardar/i });

    // Enter new valid stock level
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAdjustStock).toHaveBeenCalledWith('1', 20, undefined);
    });

    await waitFor(() => {
      expect(screen.getByText(/ajustado com sucesso/i)).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalledWith(20);
  });

  it('displays confirmation message on successful save', async () => {
    vi.mocked(stockServiceModule.stockService.adjustStock).mockResolvedValue(undefined);
    
    render(<StockAdjustmentForm item={mockItem} />);
    
    const input = screen.getByLabelText(/Novo Nível de Stock/i);
    fireEvent.change(input, { target: { value: '15' } });
    
    const submitButton = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/ajustado com sucesso/i)).toBeInTheDocument();
    });
  });
});
