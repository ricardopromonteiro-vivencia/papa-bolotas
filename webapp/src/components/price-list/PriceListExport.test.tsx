/**
 * PriceListExport Component Tests
 * 
 * Tests PDF export button functionality, loading states, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PriceListExport } from './PriceListExport';
import { menuService } from '@/services/menu.service';
import { priceListService } from '@/services/price-list.service';
import { Category } from '@/types';

// Mock services
vi.mock('@/services/menu.service');
vi.mock('@/services/price-list.service');

describe('PriceListExport', () => {
  const mockMenuItems = [
    {
      id: 'item-1',
      name: 'Sandes de Leitão',
      category: Category.SANDES,
      price: 8.00,
      stockLevel: 20,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(menuService.getMenuItems).mockResolvedValue(mockMenuItems);
    vi.mocked(priceListService.downloadPriceList).mockResolvedValue();
    
    // Mock window.alert
    global.alert = vi.fn();
  });

  it('renders export button', () => {
    render(<PriceListExport />);
    
    const button = screen.getByRole('button', { name: /Exportar Lista de Preços/i });
    expect(button).toBeInTheDocument();
  });

  it('shows loading state during generation', async () => {
    render(<PriceListExport />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/A gerar PDF/i)).toBeInTheDocument();
    });
  });

  it('calls services to generate PDF', async () => {
    render(<PriceListExport />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(menuService.getMenuItems).toHaveBeenCalled();
      expect(priceListService.downloadPriceList).toHaveBeenCalledWith(mockMenuItems);
    });
  });

  it('handles empty menu gracefully', async () => {
    vi.mocked(menuService.getMenuItems).mockResolvedValue([]);
    
    render(<PriceListExport />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(priceListService.downloadPriceList).not.toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Não há itens no menu para exportar.');
    });
  });

  it('accepts custom button text', () => {
    render(<PriceListExport buttonText="Download PDF" />);
    
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });

  it('disables button during generation', async () => {
    render(<PriceListExport />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it('calls onSuccess callback after successful export', async () => {
    const onSuccess = vi.fn();
    render(<PriceListExport onSuccess={onSuccess} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError callback on error', async () => {
    const error = new Error('Test error');
    const onError = vi.fn();
    vi.mocked(priceListService.downloadPriceList).mockRejectedValue(error);
    
    render(<PriceListExport onError={onError} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
