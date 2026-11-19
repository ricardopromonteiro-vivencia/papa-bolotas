/**
 * OrderHistory Component Example
 * 
 * Demonstrates how to use the OrderHistory component in combination with
 * OrderPanel to create a complete order management interface.
 * 
 * This example shows:
 * - Integration with OrderPanel for creating orders
 * - Automatic refresh after order registration
 * - Display of different order types (regular, complimentary, cancelled)
 * - Real-time order history updates
 */

import { useRef, useState, useEffect } from 'react';
import { OrderPanel, OrderHistory } from './';
import type { OrderPanelRef } from './OrderPanel';
import { MenuItem, Order } from '@/types';
import { db } from '@/lib/db';

/**
 * Example page showing OrderPanel and OrderHistory working together
 */
export const OrderManagementExample = () => {
  const orderPanelRef = useRef<OrderPanelRef>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [sampleMenuItems, setSampleMenuItems] = useState<MenuItem[]>([]);
  const [orderCount, setOrderCount] = useState(0);

  /**
   * Initialize example session and sample menu items
   */
  useEffect(() => {
    const initializeExample = async () => {
      // Create a demo session
      const demoSessionId = crypto.randomUUID();
      setSessionId(demoSessionId);

      // Create sample menu items
      const sampleItems: MenuItem[] = [
        {
          id: crypto.randomUUID(),
          name: 'Sandes Leitão',
          category: 'Sandes' as any,
          price: 5.50,
          stockLevel: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: crypto.randomUUID(),
          name: 'Coca-Cola',
          category: 'Bebidas' as any,
          price: 2.00,
          stockLevel: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: crypto.randomUUID(),
          name: 'Batatas Fritas',
          category: 'Batatas' as any,
          price: 3.50,
          stockLevel: 15,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      // Add to IndexedDB
      await Promise.all(
        sampleItems.map(item => db.menuItems.put(item))
      );

      setSampleMenuItems(sampleItems);
    };

    initializeExample();
  }, []);

  /**
   * Handle order registration - update order count
   */
  const handleOrderRegistered = (order: Order) => {
    console.log('Order registered:', order);
    setOrderCount(prev => prev + 1);
  };

  /**
   * Handle order history refresh
   */
  const handleOrdersRefresh = (orders: Order[]) => {
    console.log('Orders refreshed:', orders.length);
    setOrderCount(orders.length);
  };

  /**
   * Quick add item to order
   */
  const quickAddItem = (menuItem: MenuItem) => {
    if (orderPanelRef.current) {
      orderPanelRef.current.addItem(menuItem);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Initializing example...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-2">Order Management Example</h1>
          <p className="text-gray-600">
            This example demonstrates the OrderPanel and OrderHistory components
            working together. Add items to create orders and see them appear in
            the history.
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700">
              <strong>Session ID:</strong> {sessionId}
            </p>
            <p className="text-sm text-blue-700">
              <strong>Orders Created:</strong> {orderCount}
            </p>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Quick Add Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sampleMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => quickAddItem(item)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">€{item.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Stock: {item.stockLevel}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Order Panel */}
          <div>
            <OrderPanel
              ref={orderPanelRef}
              sessionId={sessionId}
              onOrderRegistered={handleOrderRegistered}
              menuItems={sampleMenuItems}
            />
          </div>

          {/* Right Column - Order History */}
          <div>
            <OrderHistory
              sessionId={sessionId}
              onRefresh={handleOrdersRefresh}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">How to Use</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex gap-3">
              <span className="font-semibold text-blue-600 w-8">1.</span>
              <p>
                Click the <strong>Quick Add Items</strong> buttons above to add
                items to the current order in the left panel.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-semibold text-blue-600 w-8">2.</span>
              <p>
                Click <strong>Register Order</strong> to complete a regular order,
                or <strong>Register Complimentary</strong> for a free order.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-semibold text-blue-600 w-8">3.</span>
              <p>
                Watch the order appear in the <strong>Order History</strong> on
                the right. Complimentary orders show a green badge.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-semibold text-blue-600 w-8">4.</span>
              <p>
                Click any order in the history to expand and see full details
                including items, quantities, and observations.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="font-semibold text-blue-600 w-8">5.</span>
              <p>
                Use the <strong>Refresh</strong> button to manually reload the
                order history (it auto-refreshes after each order).
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">OrderHistory Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800 mb-2">
                ✓ Complimentary Orders
              </h3>
              <p className="text-sm text-green-700">
                Orders registered as complimentary show a green "Complimentary"
                badge and display total as €0.00.
              </p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800 mb-2">
                ✓ Cancelled Orders
              </h3>
              <p className="text-sm text-red-700">
                Cancelled orders show a red "Cancelled" badge with strikethrough
                styling to indicate they're void.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">
                ✓ Order Details
              </h3>
              <p className="text-sm text-blue-700">
                Click any order to expand and see full item list, quantities,
                prices, observations, and timestamps.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded">
              <h3 className="font-semibold text-purple-800 mb-2">
                ✓ Real-time Updates
              </h3>
              <p className="text-sm text-purple-700">
                History automatically refreshes when new orders are registered.
                Manual refresh button available anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Requirements Met */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Requirements Fulfilled</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p>
                <strong>Requirement 5.11:</strong> Maintain order history with all
                completed orders for the current session
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p>
                <strong>Requirement 6.4:</strong> Mark complimentary orders
                distinctly in order history
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p>
                <strong>Requirement 7.7:</strong> Show cancelled orders with
                appropriate visual indicators
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p>
                <strong>Additional:</strong> Refresh functionality, order
                expansion, relative timestamps, item details
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagementExample;
