/**
 * StockDashboard Component Tests
 * 
 * Minimal tests for core functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StockDashboard } from './StockDashboard';
import { stockService } from '@/services/stock.service';
import type { StockLevel } from '@/types';

// Mock the stock service
vi.mock('@/services/stock.service', () => ({
  stockService: {
    getStockLevels: vi.fn(),
  },
}));

describe('StockDashboard', () => {
  const mockStockLevels: StockLevel[] = [
    {
      itemId: '1',
      itemName: 'Sandes de Leitão',
      currentLevel: 10,
      lastAdjustedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      itemId: '2',
      itemName: 'Coca-Cola',
      currentLevel: 0,
      lastAdjustedAt: new Date('2024-01-01T11:00:00Z'),
    },
    {
      itemId: '3',
      itemName: 'Batata Frita',
      currentLevel: 25,
      lastAdjustedAt: new Date('2024-01-01T12:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(stockService.getStockLevels).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<StockDashboard />);

    expect(screen.getByText(/a carregar stock/i)).toBeInTheDocument();
  });

  it('displays stock levels after loading', async () => {
    vi.mocked(stockService.getStockLevels).mockResolvedValue(mockStockLevels);

    render(<StockDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    expect(screen.getByText('Batata Frita')).toBeInTheDocument();
  });

  it('displays low stock warning for items with zero stock', async () => {
    vi.mocked(stockService.getStockLevels).mockResolvedValue(mockStockLevels);

    render(<StockDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    });

    // Check for low stock indicator
    const lowStockAlerts = screen.getAllByText(/stock esgotado/i);
    expect(lowStockAlerts.length).toBeGreaterThan(0);
  });

  it('displays correct statistics', async () => {
    vi.mocked(stockService.getStockLevels).mockResolvedValue(mockStockLevels);

    render(<StockDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total de Itens')).toBeInTheDocument();
    });

    // Check that statistics are displayed
    expect(screen.getByText('Total de Itens')).toBeInTheDocument();
    expect(screen.getByText('Stock Baixo')).toBeInTheDocument();
    expect(screen.getByText('Em Stock')).toBeInTheDocument();
    expect(screen.getByText('Stock Total')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    vi.mocked(stockService.getStockLevels).mockRejectedValue(
      new Error('Failed to fetch')
    );

    render(<StockDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/falha ao carregar/i)).toBeInTheDocument();
    });
  });
});
