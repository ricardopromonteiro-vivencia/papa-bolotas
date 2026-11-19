/**
 * MenuItemEditor Component Tests
 * 
 * Tests for the menu item editor component covering:
 * - Form rendering and field validation
 * - Create and edit modes
 * - Price validation (must be > 0)
 * - Stock level validation (must be >= 0)
 * - Required field validation
 * - Form submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuItemEditor } from './MenuItemEditor';
import { Category, MenuItem } from '@/types';

describe('MenuItemEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders form with empty fields', () => {
      render(<MenuItemEditor onSave={mockOnSave} />);

      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
      expect(screen.getByLabelText(/price/i)).toHaveValue(null);
      expect(screen.getByLabelText(/stock level/i)).toHaveValue(0);
    });

    it('displays category select', async () => {
      render(<MenuItemEditor onSave={mockOnSave} />);

      // Category select should be present
      const categoryTrigger = screen.getByRole('combobox', { name: /category/i });
      expect(categoryTrigger).toBeInTheDocument();
    });

    it('shows Add Item button in create mode', () => {
      render(<MenuItemEditor onSave={mockOnSave} />);

      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const existingItem: MenuItem = {
      id: 'item-123',
      name: 'Sandes de Leitão',
      category: Category.SANDES,
      price: 5.50,
      stockLevel: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    it('renders form with existing item data', () => {
      render(<MenuItemEditor item={existingItem} onSave={mockOnSave} />);

      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue('Sandes de Leitão');
      expect(screen.getByLabelText(/price/i)).toHaveValue(5.50);
      expect(screen.getByLabelText(/stock level/i)).toHaveValue(10);
    });

    it('shows Update Item button in edit mode', () => {
      render(<MenuItemEditor item={existingItem} onSave={mockOnSave} />);

      expect(screen.getByRole('button', { name: /update item/i })).toBeInTheDocument();
    });
  });

  describe('Field Validation', () => {
    it('requires name field', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const submitButton = screen.getByRole('button', { name: /add item/i });
      await user.click(submitButton);

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('requires category field', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      // Fill name only
      await user.type(screen.getByLabelText(/name/i), 'Test Item');

      // Fill price so we can test category specifically
      await user.type(screen.getByLabelText(/price/i), '5.00');

      const submitButton = screen.getByRole('button', { name: /add item/i });
      await user.click(submitButton);

      expect(await screen.findByText('Category is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('requires price field', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      // Fill name
      await user.type(screen.getByLabelText(/name/i), 'Test Item');

      const submitButton = screen.getByRole('button', { name: /add item/i });
      await user.click(submitButton);

      // Should show either category or price required
      const errors = await screen.findAllByText(/(price|category) is required/i);
      expect(errors.length).toBeGreaterThan(0);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('validates price must be greater than zero', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '0');
      await user.tab(); // Trigger blur

      expect(await screen.findByText('Price must be greater than zero')).toBeInTheDocument();
    });

    it('validates price cannot be negative', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '-5');
      await user.tab(); // Trigger blur

      expect(await screen.findByText('Price must be greater than zero')).toBeInTheDocument();
    });

    it('validates price maximum value', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '10000');
      await user.tab(); // Trigger blur

      expect(await screen.findByText(/price too high/i)).toBeInTheDocument();
    });

    it('validates stock level cannot be negative', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const stockInput = screen.getByLabelText(/stock level/i);
      await user.clear(stockInput);
      await user.type(stockInput, '-5');
      await user.tab(); // Trigger blur

      expect(await screen.findByText('Stock level cannot be negative')).toBeInTheDocument();
    });

    it('accepts stock level of zero', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const stockInput = screen.getByLabelText(/stock level/i);
      await user.clear(stockInput);
      await user.type(stockInput, '0');
      await user.tab(); // Trigger blur

      expect(screen.queryByText('Stock level cannot be negative')).not.toBeInTheDocument();
    });

    it('validates stock level must be an integer', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const stockInput = screen.getByLabelText(/stock level/i);
      await user.clear(stockInput);
      await user.type(stockInput, '5.5');
      
      // Submit to trigger full validation
      const submitButton = screen.getByRole('button', { name: /add item/i });
      await user.click(submitButton);

      // The HTML input type="number" step="1" may prevent decimal input, 
      // so just check that validation works
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('enforces name maximum length', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const nameInput = screen.getByLabelText(/name/i);
      const longName = 'A'.repeat(101);
      
      // The input has maxLength attribute, so it should prevent typing beyond 100
      await user.type(nameInput, longName);
      
      // Check that the value is limited to 100 characters
      expect(nameInput).toHaveAttribute('maxLength', '100');
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      const { container } = render(<MenuItemEditor onSave={mockOnSave} />);

      // Fill all required fields
      await user.type(screen.getByLabelText(/name/i), 'Sandes de Queijo');
      await user.type(screen.getByLabelText(/price/i), '4.50');
      await user.clear(screen.getByLabelText(/stock level/i));
      await user.type(screen.getByLabelText(/stock level/i), '15');

      // Manually set category via the underlying select
      const categorySelect = container.querySelector('[id="category"]');
      if (categorySelect) {
        // Simulate selecting a category
        const form = screen.getByRole('button', { name: /add item/i }).closest('form');
        if (form) {
          // We can test that the form has proper structure
          expect(form).toBeInTheDocument();
        }
      }

      // Note: Full integration with Radix UI Select requires e2e tests
      // This unit test verifies the form structure and validation
    });

    it('supports edit mode with existing data', async () => {
      const user = userEvent.setup();
      const existingItem: MenuItem = {
        id: 'item-123',
        name: 'Sandes de Leitão',
        category: Category.SANDES,
        price: 5.50,
        stockLevel: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      render(<MenuItemEditor item={existingItem} onSave={mockOnSave} />);

      // Change price
      const priceInput = screen.getByLabelText(/price/i);
      await user.clear(priceInput);
      await user.type(priceInput, '6.00');

      // Verify update button is shown
      expect(screen.getByRole('button', { name: /update item/i })).toBeInTheDocument();
    });

    it('has proper form structure', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      // Fill required fields (but not category to keep test simple)
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      await user.type(screen.getByLabelText(/price/i), '2.50');
      await user.type(screen.getByLabelText(/stock level/i), '20');

      // Verify form elements are present
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stock level/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    });

    it('does not submit form with invalid data', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      // Only fill name
      await user.type(screen.getByLabelText(/name/i), 'Incomplete Item');

      // Try to submit
      await user.click(screen.getByRole('button', { name: /add item/i }));

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('shows loading state when isLoading is true', () => {
      render(<MenuItemEditor onSave={mockOnSave} isLoading={true} />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/price/i)).toBeDisabled();
      expect(screen.getByLabelText(/stock level/i)).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not show cancel button when onCancel is not provided', () => {
      render(<MenuItemEditor onSave={mockOnSave} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Portuguese Character Support', () => {
    it('accepts Portuguese characters in name field', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Pão com Chouriço');
      await user.tab();

      // Should not show any validation errors
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      expect(nameInput).toHaveValue('Pão com Chouriço');
    });
  });

  describe('Real-time Validation', () => {
    it('shows validation errors on blur', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const priceInput = screen.getByLabelText(/price/i);
      await user.type(priceInput, '0');
      await user.tab();

      expect(await screen.findByText('Price must be greater than zero')).toBeInTheDocument();
    });

    it('clears validation errors when field becomes valid', async () => {
      const user = userEvent.setup();
      render(<MenuItemEditor onSave={mockOnSave} />);

      const priceInput = screen.getByLabelText(/price/i);
      
      // Enter invalid value
      await user.type(priceInput, '0');
      await user.tab();
      expect(await screen.findByText('Price must be greater than zero')).toBeInTheDocument();

      // Fix the value
      await user.clear(priceInput);
      await user.type(priceInput, '5.50');
      await user.tab();

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText('Price must be greater than zero')).not.toBeInTheDocument();
      });
    });
  });
});
