/**
 * MenuItemEditor Usage Examples
 * 
 * This file demonstrates how to use the MenuItemEditor component
 * in both create and edit modes.
 */

import { useState } from 'react';
import { MenuItemEditor } from './MenuItemEditor';
import { MenuItem, Category } from '@/types';

/**
 * Example 1: Create Mode
 * Using MenuItemEditor to add a new menu item
 */
export function CreateMenuItemExample() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (itemData: Partial<MenuItem>) => {
    setIsLoading(true);
    try {
      // Call your menu service to create the item
      // await menuService.createMenuItem(itemData);
      console.log('Creating item:', itemData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Menu item created successfully!');
    } catch (error) {
      console.error('Failed to create menu item:', error);
      throw error; // Re-throw so the form can show the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate away or close modal
    console.log('Create cancelled');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <MenuItemEditor 
        onSave={handleSave} 
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * Example 2: Edit Mode
 * Using MenuItemEditor to update an existing menu item
 */
export function EditMenuItemExample() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Existing menu item to edit
  const existingItem: MenuItem = {
    id: 'item-123',
    name: 'Sandes de Leitão',
    category: Category.SANDES,
    price: 5.50,
    stockLevel: 10,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    version: 1,
  };

  const handleSave = async (itemData: Partial<MenuItem>) => {
    setIsLoading(true);
    try {
      // Call your menu service to update the item
      // await menuService.updateMenuItem(itemData.id!, itemData);
      console.log('Updating item:', itemData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Menu item updated successfully!');
    } catch (error) {
      console.error('Failed to update menu item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate back or close modal
    console.log('Edit cancelled');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <MenuItemEditor 
        item={existingItem}
        onSave={handleSave} 
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * Example 3: In a Modal Dialog
 * Using MenuItemEditor within a modal for inline editing
 */
export function MenuItemEditorInModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);

  const handleOpenCreate = () => {
    setEditingItem(undefined);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsOpen(true);
  };

  const handleSave = async (itemData: Partial<MenuItem>) => {
    setIsLoading(true);
    try {
      if (editingItem) {
        // Update existing item
        // await menuService.updateMenuItem(itemData.id!, itemData);
        console.log('Updating:', itemData);
      } else {
        // Create new item
        // await menuService.createMenuItem(itemData);
        console.log('Creating:', itemData);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsOpen(false);
      setEditingItem(undefined);
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditingItem(undefined);
  };

  return (
    <div className="p-6">
      <div className="space-y-4">
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add New Item
        </button>

        <button
          onClick={() => handleOpenEdit({
            id: 'demo-item',
            name: 'Demo Item',
            category: Category.BEBIDAS,
            price: 3.50,
            stockLevel: 20,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          })}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-4"
        >
          Edit Demo Item
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MenuItemEditor
                item={editingItem}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: With Form State Management
 * Managing form state externally
 */
export function MenuItemEditorWithExternalState() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (itemData: Partial<MenuItem>) => {
    setIsLoading(true);
    try {
      // Create a full menu item with generated id
      const newItem: MenuItem = {
        id: `item-${Date.now()}`,
        name: itemData.name!,
        category: itemData.category!,
        price: itemData.price!,
        stockLevel: itemData.stockLevel!,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Add to local state
      setItems(prev => [...prev, newItem]);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Item saved:', newItem);
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Form */}
      <div>
        <MenuItemEditor onSave={handleSave} isLoading={isLoading} />
      </div>

      {/* Items List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Created Items ({items.length})</h3>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="p-3 border rounded">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-600">
                {item.category} - €{item.price.toFixed(2)} - Stock: {item.stockLevel}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-500 text-sm">No items created yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
