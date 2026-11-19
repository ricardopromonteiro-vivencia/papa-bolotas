/**
 * StockAdjustmentForm Usage Example
 * 
 * This file demonstrates how to use the StockAdjustmentForm component
 */

import { useState } from 'react';
import { StockAdjustmentForm } from './StockAdjustmentForm';
import { MenuItem, Category } from '@/types';

/**
 * Example: Using StockAdjustmentForm in a stock management page
 */
export function StockAdjustmentExample() {
  const [_selectedItem, _setSelectedItem] = useState<MenuItem | null>(null);

  // Example menu item
  const exampleItem: MenuItem = {
    id: '123',
    name: 'Sandes de Leitão',
    category: Category.SANDES,
    price: 4.50,
    stockLevel: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const handleSuccess = (newLevel: number) => {
    console.log('Stock adjusted successfully to:', newLevel);
    // Refresh your stock list here
  };

  const handleCancel = () => {
    console.log('Stock adjustment cancelled');
    _setSelectedItem(null);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Ajustar Stock</h1>
      
      {/* Example 1: Basic usage */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Exemplo 1: Uso Básico</h2>
        <StockAdjustmentForm item={exampleItem} />
      </div>

      {/* Example 2: With callbacks */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Exemplo 2: Com Callbacks</h2>
        <StockAdjustmentForm
          item={exampleItem}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>

      {/* Example 3: With custom styling */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Exemplo 3: Com Estilo Customizado</h2>
        <StockAdjustmentForm
          item={exampleItem}
          className="max-w-2xl"
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}

/**
 * Example: Integration with modal/dialog
 */
export function StockAdjustmentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<MenuItem | null>(null);

  // Example function to demonstrate how to open adjustment for a menu item
  // @ts-expect-error - Intentionally unused in this example
  const _handleOpenAdjustment = (menuItem: MenuItem) => {
    setItem(menuItem);
    setIsOpen(true);
  };

  const handleSuccess = (newLevel: number) => {
    console.log('Stock updated to:', newLevel);
    // Optional: Close modal after success
    setTimeout(() => {
      setIsOpen(false);
    }, 2000);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <div>
      {isOpen && item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <StockAdjustmentForm
              item={item}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StockAdjustmentExample;
