/**
 * MenuGrid Component Tests
 * 
 * Tests the MenuGrid component's rendering and functionality.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuGrid } from './MenuGrid';
import { menuService } from '@/services/menu.service';
import { MenuItem, Category } from '@/types';

// Mock the menu service
vi.mock('@/services/menu.service', () => ({
  menuService: {
    getMenuItems: vi.fn(),
  },
}));

describe('MenuGrid', () => {
  const mockItems: MenuItem[] = [
    {
      id: '1',
      name: 'Sandes de Leitão',
      category: Category.SANDES,
      price: 5.50,
      stockLevel: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    },
    {
      id: '2',
      name: 'Coca-Cola',
      category: Category.BEBIDAS,
      price: 2.00,
      stockLevel: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    },
    {
      id: '3',
      name: 'Tábua de Queijos',
      category: Category.TABUAS,
      price: 12.00,
      stockLevel: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    },
  ];

  const mockOnItemSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (menuService.getMenuItems as Mock).mockResolvedValue(mockItems);
  });

  it('renders loading state initially', () => {
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);
    expect(screen.getByText(/a carregar menu/i)).toBeInTheDocument();
  });

  it('renders menu items after loading', async () => {
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
      expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
      expect(screen.getByText('Tábua de Queijos')).toBeInTheDocument();
    });
  });

  it('displays correct item count', async () => {
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText('3 itens')).toBeInTheDocument();
    });
  });

  it('renders category filter', async () => {
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /filtro de categorias/i })).toBeInTheDocument();
    });
  });

  it('filters items by category', async () => {
    const user = userEvent.setup();
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    // Click on "Sandes" category filter
    const sandesButton = screen.getByRole('button', { name: /filtrar por sandes/i });
    await user.click(sandesButton);

    // Should show only Sandes items
    expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    expect(screen.queryByText('Coca-Cola')).not.toBeInTheDocument();
    expect(screen.queryByText('Tábua de Queijos')).not.toBeInTheDocument();
    expect(screen.getByText('1 item em Sandes')).toBeInTheDocument();
  });

  it('shows all items when "Todos" is selected', async () => {
    const user = userEvent.setup();
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    // Click on "Bebidas" category
    const bebidasButton = screen.getByRole('button', { name: /filtrar por bebidas/i });
    await user.click(bebidasButton);

    // Should show only Bebidas
    expect(screen.queryByText('Sandes de Leitão')).not.toBeInTheDocument();
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();

    // Click on "Todos"
    const todosButton = screen.getByRole('button', { name: /filtrar por todos/i });
    await user.click(todosButton);

    // Should show all items again
    expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    expect(screen.getByText('Tábua de Queijos')).toBeInTheDocument();
  });

  it('calls onItemSelect when item is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });

    // Click on an item
    const item = screen.getByText('Sandes de Leitão');
    await user.click(item);

    expect(mockOnItemSelect).toHaveBeenCalledTimes(1);
    expect(mockOnItemSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('handles service error', async () => {
    const user = userEvent.setup();
    (menuService.getMenuItems as Mock).mockRejectedValue(new Error('Service error'));

    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/falha ao carregar itens do menu/i)).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    expect(retryButton).toBeInTheDocument();

    // Click retry
    (menuService.getMenuItems as Mock).mockResolvedValue(mockItems);
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
    });
  });

  it('shows empty state when no items', async () => {
    (menuService.getMenuItems as Mock).mockResolvedValue([]);

    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum item de menu disponível/i)).toBeInTheDocument();
    });
  });

  it('displays stock levels correctly', async () => {
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Stock: 10')).toBeInTheDocument();
      expect(screen.getByText('Stock: 0')).toBeInTheDocument();
      expect(screen.getByText('Stock: 5')).toBeInTheDocument();
    });
  });

  it('displays prices correctly', async () => {
    render(<MenuGrid onItemSelect={mockOnItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText('€5.50')).toBeInTheDocument();
      expect(screen.getByText('€2.00')).toBeInTheDocument();
      expect(screen.getByText('€12.00')).toBeInTheDocument();
    });
  });

  it('renders with initial category', async () => {
    render(
      <MenuGrid
        onItemSelect={mockOnItemSelect}
        initialCategory={Category.SANDES}
      />
    );

    await waitFor(() => {
      // Should show only Sandes items
      expect(screen.getByText('Sandes de Leitão')).toBeInTheDocument();
      expect(screen.queryByText('Coca-Cola')).not.toBeInTheDocument();
      expect(screen.queryByText('Tábua de Queijos')).not.toBeInTheDocument();
    });
  });
});
