/**
 * ReceiptPreview Component Usage Examples
 * 
 * This file demonstrates how to use the ReceiptPreview component
 * in different scenarios.
 */

import { ReceiptPreview } from './ReceiptPreview';
import { Order } from '@/types';

/**
 * Example 1: Basic Receipt Preview
 * 
 * Display a receipt for a regular order with items
 */
export function BasicReceiptExample() {
  const order: Order = {
    id: 'order-123',
    orderNumber: 42,
    sessionId: 'session-1',
    total: 18.50,
    isComplimentary: false,
    isCancelled: false,
    observations: 'Sem cebola',
    items: [
      {
        id: 'item-1',
        orderId: 'order-123',
        menuItemId: 'menu-1',
        menuItemName: 'Sandes de Leitão',
        quantity: 2,
        unitPrice: 5.50,
        subtotal: 11.00
      },
      {
        id: 'item-2',
        orderId: 'order-123',
        menuItemId: 'menu-2',
        menuItemName: 'Coca-Cola',
        quantity: 1,
        unitPrice: 2.50,
        subtotal: 2.50
      },
      {
        id: 'item-3',
        orderId: 'order-123',
        menuItemId: 'menu-3',
        menuItemName: 'Batatas Fritas',
        quantity: 1,
        unitPrice: 5.00,
        subtotal: 5.00
      }
    ],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15T14:30:00'),
    version: 1
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Example: Basic Receipt</h2>
      <ReceiptPreview order={order} />
    </div>
  );
}

/**
 * Example 2: Complimentary Order Receipt
 * 
 * Display a receipt for a complimentary (free) order
 * Shows "OFERTA" indicator and €0.00 total
 */
export function ComplimentaryReceiptExample() {
  const order: Order = {
    id: 'order-456',
    orderNumber: 43,
    sessionId: 'session-1',
    total: 0.00,
    isComplimentary: true,
    isCancelled: false,
    observations: 'Oferta da casa',
    items: [
      {
        id: 'item-1',
        orderId: 'order-456',
        menuItemId: 'menu-1',
        menuItemName: 'Café',
        quantity: 1,
        unitPrice: 0.80,
        subtotal: 0.80
      }
    ],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15T15:00:00'),
    version: 1
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Example: Complimentary Receipt</h2>
      <p className="text-sm text-gray-600 mb-3">
        Note: Complimentary orders display "*** OFERTA ***" and €0.00 total
      </p>
      <ReceiptPreview order={order} />
    </div>
  );
}

/**
 * Example 3: Receipt in Modal Dialog
 * 
 * Shows how to display receipt in a modal/dialog for immediate viewing
 * after order registration
 */
export function ReceiptModalExample() {
  const order: Order = {
    id: 'order-789',
    orderNumber: 44,
    sessionId: 'session-1',
    total: 12.50,
    isComplimentary: false,
    isCancelled: false,
    observations: undefined,
    items: [
      {
        id: 'item-1',
        orderId: 'order-789',
        menuItemId: 'menu-1',
        menuItemName: 'Tábua de Queijos',
        quantity: 1,
        unitPrice: 12.50,
        subtotal: 12.50
      }
    ],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15T16:30:00'),
    version: 1
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Example: Receipt in Modal</h2>
      <div className="bg-gray-100 p-6 rounded-lg">
        <div className="bg-white p-4 rounded shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Pedido Registado com Sucesso!
          </h3>
          <ReceiptPreview order={order} />
        </div>
      </div>
    </div>
  );
}

/**
 * Example 4: Integration with OrderHistory
 * 
 * Shows how ReceiptPreview can be used from OrderHistory component
 * when user clicks "Print Receipt" button
 */
export function OrderHistoryIntegrationExample() {
  const handlePrintReceipt = (order: Order) => {
    // This would typically open a modal or new window with ReceiptPreview
    console.log('Printing receipt for order:', order.orderNumber);
  };

  const order: Order = {
    id: 'order-999',
    orderNumber: 45,
    sessionId: 'session-1',
    total: 25.00,
    isComplimentary: false,
    isCancelled: false,
    observations: 'Mesa 5',
    items: [
      {
        id: 'item-1',
        orderId: 'order-999',
        menuItemId: 'menu-1',
        menuItemName: 'Sandes de Leitão',
        quantity: 3,
        unitPrice: 5.50,
        subtotal: 16.50
      },
      {
        id: 'item-2',
        orderId: 'order-999',
        menuItemId: 'menu-2',
        menuItemName: 'Sumol de Laranja',
        quantity: 2,
        unitPrice: 2.00,
        subtotal: 4.00
      },
      {
        id: 'item-3',
        orderId: 'order-999',
        menuItemId: 'menu-3',
        menuItemName: 'Pastel de Nata',
        quantity: 3,
        unitPrice: 1.50,
        subtotal: 4.50
      }
    ],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-15T17:00:00'),
    version: 1
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Example: Order History Integration</h2>
      <button
        onClick={() => handlePrintReceipt(order)}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Print Receipt for Order #{order.orderNumber}
      </button>
      <ReceiptPreview order={order} />
    </div>
  );
}

/**
 * Notes on Usage:
 * 
 * 1. Thermal Printer Format:
 *    - Receipt is formatted to 32 characters wide
 *    - Monospace font preserves alignment
 *    - Print media query optimizes for 80mm thermal printer
 * 
 * 2. Print Functionality:
 *    - Click "Imprimir Talão" button triggers window.print()
 *    - Browser print dialog allows selecting thermal printer
 *    - Print CSS hides UI elements and shows only receipt
 * 
 * 3. Complimentary Orders:
 *    - Automatically shows "*** OFERTA ***" text
 *    - Total is displayed as €0.00
 *    - Items are still listed with original prices
 * 
 * 4. Responsive Design:
 *    - Screen view: Receipt displayed in centered container
 *    - Print view: Optimized for thermal printer width (80mm)
 * 
 * 5. Integration Points:
 *    - OrderPanel: Show receipt after order registration
 *    - OrderHistory: Print receipt for historical orders
 *    - CancelOrderDialog: Print cancellation receipt
 */
