/**
 * OrderHistory Component
 * 
 * Displays completed orders for the current session, with support for:
 * - Viewing order details (number, time, total, items)
 * - Marking complimentary orders distinctly
 * - Showing cancelled orders with strikethrough
 * - Refreshing order list
 * - Cancelling orders with security verification (Task 9.3)
 * 
 * Requirements:
 * - 5.11: Maintain order history with all completed orders for the session
 * - 6.4: Mark complimentary orders distinctly in order history
 * - 7.1: Provide order cancellation function
 * - 7.4: Display cancellable orders
 * - 7.7: Mark cancelled orders in order history
 * - 7.8: Generate cancellation receipt
 */

import { useState, useEffect } from 'react';
import { Order } from '@/types';
import { orderService } from '@/services';
import { receiptService } from '@/services/receipt.service';
import { printReceipt, printTickets, printKitchenCancellation } from '@/lib/print-receipt';
import { buildCustomerTicket } from '@/lib/ticket';
import { Button } from '@/components/ui/button';
import { CancelOrderDialog } from './CancelOrderDialog';
import { 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Gift,
  XCircle,
  Trash2,
  Printer
} from 'lucide-react';
import { formatDistance } from 'date-fns';

interface OrderHistoryProps {
  /** Current session ID to fetch orders for */
  sessionId: string;
  /** Callback when orders are refreshed (optional) */
  onRefresh?: (orders: Order[]) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ 
  sessionId, 
  onRefresh 
}) => {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Load orders for the current session
   * Requirement 5.11: Display completed orders for session
   */
  const loadOrders = async () => {
    try {
      setError(null);
      const sessionOrders = await orderService.getSessionOrders(sessionId);
      setOrders(sessionOrders);
      
      if (onRefresh) {
        onRefresh(sessionOrders);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar pedidos';
      setError(message);
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Refresh orders from database
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
  };

  /**
   * Toggle order details expansion
   */
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  /**
   * Handle cancel order button click
   * 
   * Requirement 7.1: Provide order cancellation function
   * Requirement 7.4: Display cancellable orders
   */
  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  };

  /**
   * Handle successful order cancellation
   * 
   * Requirement 7.7: Update UI to show cancelled status
   * Requirement 7.8: Generate cancellation receipt (via service)
   */
  const handleCancelSuccess = async (cancelledOrder: Order) => {
    // Refresh order list to show updated status
    await loadOrders();
    
    // Talão de cancelamento para a cozinha (usa os artigos do pedido original se o devolvido vier sem eles)
    const forKitchen =
      cancelledOrder.items?.length || !orderToCancel
        ? cancelledOrder
        : { ...cancelledOrder, items: orderToCancel.items };
    let printNote = ' A cozinha foi avisada.';
    try {
      await printKitchenCancellation(forKitchen);
    } catch (err) {
      console.error('Failed to print kitchen cancellation:', err);
      printNote = ' Atenção: não foi possível imprimir o aviso para a cozinha.';
    }

    setSuccessMessage(
      `O pedido #${cancelledOrder.orderNumber} foi cancelado. O stock foi reposto.${printNote}`
    );

    // Clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  /**
   * Handle print receipt
   * 
   * Requirement 7.8: Generate cancellation receipt
   */
  const handlePrintReceipt = async (order: Order) => {
    try {
      // Reimpressão: só o talão do cliente (o da cozinha já saiu quando o pedido foi registado)
      if (order.isCancelled) {
        await printReceipt(receiptService.generateCancellationReceipt(order), `Pedido #${order.orderNumber}`);
      } else {
        await printTickets([buildCustomerTicket(order)]);
      }
    } catch (err) {
      console.error('Failed to print receipt:', err);
      alert(`Não foi possível imprimir o recibo do pedido #${order.orderNumber}.`);
    }
  };

  // Load orders on mount and when sessionId changes
  useEffect(() => {
    setIsLoading(true);
    loadOrders();
  }, [sessionId]);

  /**
   * Get display status for an order
   */
  const getOrderStatus = (order: Order): { 
    label: string; 
    className: string; 
    icon: React.ReactNode 
  } => {
    if (order.isCancelled) {
      return {
        label: 'Cancelado',
        className: 'text-red-600 bg-red-50',
        icon: <XCircle className="h-4 w-4" />
      };
    }
    
    if (order.isComplimentary) {
      return {
        label: 'Oferta',
        className: 'text-green-600 bg-green-50',
        icon: <Gift className="h-4 w-4" />
      };
    }

    return {
      label: 'Concluído',
      className: 'text-blue-600 bg-blue-50',
      icon: null
    };
  };

  /**
   * Format time relative to now
   */
  const formatRelativeTime = (date: Date): string => {
    return formatDistance(date, new Date(), { addSuffix: true });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <p>A carregar pedidos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-700 font-medium mb-2">Erro ao carregar pedidos</p>
          <p className="text-red-600 text-sm">{error}</p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Pedidos</h2>
          <p className="text-sm text-gray-600 mt-1">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} na sessão atual
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-400 border-2 border-dashed rounded-lg">
          <p>Ainda não há pedidos nesta sessão</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const status = getOrderStatus(order);
            const showStrikethrough = order.isCancelled;

            return (
              <div
                key={order.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  showStrikethrough ? 'opacity-60' : ''
                }`}
              >
                {/* Order Header - Always Visible */}
                <button
                  onClick={() => toggleOrderExpansion(order.id)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Order Number */}
                    <span className={`font-bold text-lg ${showStrikethrough ? 'line-through' : ''}`}>
                      #{order.orderNumber}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${status.className}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>

                    {/* Time */}
                    <span className="text-sm text-gray-600">
                      {formatRelativeTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Total */}
                    <span className={`font-semibold ${showStrikethrough ? 'line-through' : ''}`}>
                      €{order.total.toFixed(2)}
                    </span>

                    {/* Expand Icon */}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Order Details - Expandable */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-white border-t">
                    {/* Order Items */}
                    <div className="space-y-2 mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Artigos:</p>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex justify-between items-start py-2 border-b last:border-b-0 ${
                            showStrikethrough ? 'line-through' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.menuItemName}</p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} × €{item.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            €{item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Observations */}
                    {order.observations && (
                      <div className="mb-3 p-2 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Observações:
                        </p>
                        <p className="text-sm text-gray-600">{order.observations}</p>
                      </div>
                    )}

                    {/* Order Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Criado:</span>{' '}
                        {order.createdAt.toLocaleString()}
                      </div>
                      {order.cancelledAt && (
                        <div>
                          <span className="font-medium">Cancelado:</span>{' '}
                          {order.cancelledAt.toLocaleString()}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Artigos:</span>{' '}
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </div>
                      <div>
                        <span className="font-medium">Estado:</span>{' '}
                        {status.label}
                      </div>
                    </div>

                    {/* Special Messages */}
                    {order.isComplimentary && !order.isCancelled && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          Este pedido foi uma oferta (sem custo)
                        </p>
                      </div>
                    )}

                    {order.isCancelled && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Este pedido foi cancelado e o stock foi reposto
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2 pt-3 border-t">
                      <Button
                        onClick={() => handlePrintReceipt(order)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir Recibo
                      </Button>
                      
                      {!order.isCancelled && (
                        <Button
                          onClick={() => handleCancelClick(order)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancelar Pedido
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        order={orderToCancel}
        isOpen={isCancelDialogOpen}
        onClose={() => {
          setIsCancelDialogOpen(false);
          setOrderToCancel(null);
        }}
        onSuccess={handleCancelSuccess}
      />
    </div>
  );
};

export default OrderHistory;
