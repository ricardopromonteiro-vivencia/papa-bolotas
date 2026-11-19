/**
 * OrderPanel Component
 * 
 * Main order creation interface for the POS system.
 * Allows adding items, managing the current order, and registering
 * regular or complimentary orders.
 * 
 * Requirements:
 * - 5.1: Add items to order
 * - 5.2: Display order items with prices
 * - 5.3: Calculate and display total
 * - 5.4: Add observations
 * - 5.5: Remove items from order
 * - 5.6: Clear all items
 * - 5.7: Register order with sequential number
 * - 5.8: Record timestamp
 * - 5.9: Decrement stock
 * - 6.1: Register complimentary orders
 * - 6.2: Decrement stock for complimentary
 */

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Order, OrderItem, MenuItem } from '@/types';
import { orderService } from '@/services';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, X } from 'lucide-react';

interface OrderPanelProps {
  /** Current session ID */
  sessionId: string;
  /** Callback when order is successfully registered */
  onOrderRegistered?: (order: Order) => void;
  /** Optional: Available menu items for selection (task 8.2 will add this) */
  menuItems?: MenuItem[];
}

export interface OrderPanelRef {
  addItem: (menuItem: MenuItem, quantity?: number) => void;
  clearOrder: () => void;
}

export const OrderPanel = forwardRef<OrderPanelRef, OrderPanelProps>(
  ({ sessionId, onOrderRegistered }, ref) => {
  // Current order state
  const [currentItems, setCurrentItems] = useState<Omit<OrderItem, 'id' | 'orderId'>[]>([]);
  const [observations, setObservations] = useState('');
  
  // UI state
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Calculate order total
   * Requirement: 5.3 - Calculate and display order total
   */
  const calculateTotal = (): number => {
    return currentItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  /**
   * Add item to order
   * Requirement: 5.1 - Add items to order
   */
  const addItem = (menuItem: MenuItem, quantity: number = 1) => {
    const subtotal = menuItem.price * quantity;
    
    const newItem: Omit<OrderItem, 'id' | 'orderId'> = {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity,
      unitPrice: menuItem.price,
      subtotal,
    };

    setCurrentItems(prev => [...prev, newItem]);
    setError(null);
    setSuccess(null);
  };

  /**
   * Remove item from order
   * Requirement: 5.5 - Remove items from order
   */
  const removeItem = (index: number) => {
    setCurrentItems(prev => prev.filter((_, i) => i !== index));
    setError(null);
    setSuccess(null);
  };

  /**
   * Clear all items from order
   * Requirement: 5.6 - Clear all items
   */
  const clearOrder = () => {
    setCurrentItems([]);
    setObservations('');
    setError(null);
    setSuccess(null);
  };

  /**
   * Register regular order
   * Requirements:
   * - 5.7: Assign sequential order number
   * - 5.8: Record timestamp
   * - 5.9: Decrement stock quantities
   */
  const handleRegisterOrder = async () => {
    if (currentItems.length === 0) {
      setError('Cannot register empty order');
      return;
    }

    setIsRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      // Create order
      const order = await orderService.createOrder(
        sessionId,
        currentItems,
        observations || undefined
      );

      // Register order (assigns number, timestamp, decrements stock)
      const registeredOrder = await orderService.registerOrder(order);

      // Clear order panel
      clearOrder();
      
      // Show success message
      setSuccess(`Order #${registeredOrder.orderNumber} registered successfully`);
      
      // Notify parent component
      if (onOrderRegistered) {
        onOrderRegistered(registeredOrder);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register order';
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * Register complimentary order
   * Requirements:
   * - 6.1: Register complimentary with total = 0
   * - 6.2: Decrement stock for complimentary
   */
  const handleRegisterComplimentary = async () => {
    if (currentItems.length === 0) {
      setError('Cannot register empty order');
      return;
    }

    setIsRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      // Create order
      const order = await orderService.createOrder(
        sessionId,
        currentItems,
        observations || undefined
      );

      // Register as complimentary (sets total to 0, decrements stock)
      const registeredOrder = await orderService.registerComplimentary(order);

      // Clear order panel
      clearOrder();
      
      // Show success message
      setSuccess(`Complimentary order #${registeredOrder.orderNumber} registered`);
      
      // Notify parent component
      if (onOrderRegistered) {
        onOrderRegistered(registeredOrder);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register complimentary order';
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  const total = calculateTotal();
  const hasItems = currentItems.length > 0;

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    addItem,
    clearOrder,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Current Order</h2>
        {hasItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearOrder}
            disabled={isRegistering}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Order Items List */}
      <div className="space-y-2 min-h-[200px]">
        {currentItems.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-400">
            <p>No items in order</p>
          </div>
        ) : (
          currentItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <p className="font-medium">{item.menuItemName}</p>
                <p className="text-sm text-gray-600">
                  {item.quantity} x €{item.unitPrice.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">€{item.subtotal.toFixed(2)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={isRegistering}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Observations */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Observations (optional)
        </label>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Add any special instructions or notes..."
          disabled={isRegistering}
          rows={2}
        />
      </div>

      {/* Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total:</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleRegisterOrder}
          disabled={!hasItems || isRegistering}
          className="flex-1"
          size="lg"
        >
          {isRegistering ? 'Registering...' : 'Register Order'}
        </Button>
        
        <Button
          onClick={handleRegisterComplimentary}
          disabled={!hasItems || isRegistering}
          variant="outline"
          className="flex-1"
          size="lg"
        >
          {isRegistering ? 'Registering...' : 'Register Complimentary'}
        </Button>
      </div>
    </div>
  );
});

OrderPanel.displayName = 'OrderPanel';
