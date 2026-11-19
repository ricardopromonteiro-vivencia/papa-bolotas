/**
 * LossRecordForm Component Tests
 * 
 * Minimal tests for the loss recording form component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LossRecordForm } from './LossRecordForm';
import { Category } from '@/types';
import * as stockServiceModule from '@/services/stock.service';

// Mock the stock service
vi.mock('@/services/stock.service', () => ({
  stockService: {
    recordLoss: vi.fn(),
  },
  StockServiceError: class StockServiceError extends Error {
    constructor(message: string, public code?: string, public statusCode?: number) {
      super(message);
      this.name = 'StockServiceError';
    }
  },
}));

describe('LossRecordForm', () => {
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
    render(<LossRecordForm item={mockItem} />);
    
    expect(screen.getByText(/Test Item/i)).toBeInTheDocument();
    expect(screen.getByText(/Stock Atual:/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('validates positive integer quantity', async () => {
    render(<LossRecordForm item={mockItem} />);
    
    const quantityInput = screen.getByLabelText(/Quantidade Perdida/i);
    const reasonInput = screen.getByLabelText(/Motivo/i);

    // Test negative number
    fireEvent.change(quantityInput, { target: { value: '-5' } });
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });
    fireEvent.submit(quantityInput.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText(/deve ser maior que zero/i)).toBeInTheDocument();
    });

    // Test zero
    fireEvent.change(quantityInput, { target: { value: '0' } });
    fireEvent.submit(quantityInput.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText(/deve ser maior que zero/i)).toBeInTheDocument();
    });
  });

  it('shows warning when quantity exceeds stock', async () => {
    render(<LossRecordForm item={mockItem} />);
    
    const quantityInput = screen.getByLabelText(/Quantidade Perdida/i);
    
    // Enter quantity exceeding stock
    fireEvent.change(quantityInput, { target: { value: '15' } });

    await waitFor(() => {
      expect(screen.getByText(/Aviso:/i)).toBeInTheDocument();
      expect(screen.getByText(/excede o stock atual/i)).toBeInTheDocument();
    });
  });

  it('records loss within stock limit', async () => {
    const mockRecordLoss = vi.fn().mockResolvedValue(undefined);
    vi.mocked(stockServiceModule.stockService.recordLoss).mockImplementation(mockRecordLoss);
    
    const onSuccess = vi.fn();
    render(<LossRecordForm item={mockItem} onSuccess={onSuccess} />);
    
    const quantityInput = screen.getByLabelText(/Quantidade Perdida/i);
    const reasonInput = screen.getByLabelText(/Motivo/i);
    const submitButton = screen.getByRole('button', { name: /Registar Perda/i });

    // Enter valid loss data
    fireEvent.change(quantityInput, { target: { value: '5' } });
    fireEvent.change(reasonInput, { target: { value: 'Quebra' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRecordLoss).toHaveBeenCalledWith('1', 5, 'Quebra');
    });

    await waitFor(() => {
      expect(screen.getByText(/registada com sucesso/i)).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});
