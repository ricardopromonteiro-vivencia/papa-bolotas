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
import { Order, OrderItem, MenuItem, isItemAvailable, tracksStock } from '@/types';
import { orderService } from '@/services';
import { printOrderTickets } from '@/lib/print-receipt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Printer, Trash2, X } from 'lucide-react';

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
  // Botão que está a registar (para mostrar "A registar..." só nesse botão)
  const [pendingAction, setPendingAction] = useState<'order' | 'print' | 'offer' | null>(null);
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
    // Artigo bloqueado à mão: não entra no pedido
    if (!isItemAvailable(menuItem)) {
      setSuccess(null);
      setError(`"${menuItem.name}" está esgotado. Pode desbloqueá-lo em Definições.`);
      return;
    }

    // Artigo com controlo de stock: não deixa passar do stock que existe
    if (tracksStock(menuItem)) {
      const inOrder = currentItems
        .filter(i => i.menuItemId === menuItem.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (menuItem.stockLevel <= 0) {
        setSuccess(null);
        setError(`"${menuItem.name}" está esgotado (stock 0). Reponha o stock na página Stock.`);
        return;
      }
      if (inOrder + quantity > menuItem.stockLevel) {
        setSuccess(null);
        setError(`Só há ${menuItem.stockLevel} de "${menuItem.name}" em stock.`);
        return;
      }
    }

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
  const handleRegisterOrder = async (print = false) => {
    if (currentItems.length === 0) {
      setError('Não é possível registar um pedido vazio');
      return;
    }

    setIsRegistering(true);
    setPendingAction(print ? 'print' : 'order');
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
      setSuccess(`Pedido #${registeredOrder.orderNumber} registado com sucesso`);

      // Imprimir depois de registar; uma falha na impressão não anula o pedido
      if (print) {
        try {
          // Talão do cliente + talão da cozinha (uma ou duas impressoras)
          const outcome = await printOrderTickets(registeredOrder);
          if (outcome.note) {
            setSuccess(`Pedido #${registeredOrder.orderNumber} registado. ${outcome.note}`);
          }
        } catch (printErr) {
          console.error('Failed to print receipt:', printErr);
          setError(
            `O pedido #${registeredOrder.orderNumber} foi registado, mas a impressão falhou. ` +
            'Pode imprimi-lo no Histórico.'
          );
        }
      }
      
      // Notify parent component
      if (onOrderRegistered) {
        onOrderRegistered(registeredOrder);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao registar o pedido';
      setError(message);
    } finally {
      setIsRegistering(false);
      setPendingAction(null);
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
      setError('Não é possível registar um pedido vazio');
      return;
    }

    setIsRegistering(true);
    setPendingAction('offer');
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
      setSuccess(`Pedido de oferta #${registeredOrder.orderNumber} registado`);
      
      // Notify parent component
      if (onOrderRegistered) {
        onOrderRegistered(registeredOrder);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao registar o pedido de oferta';
      setError(message);
    } finally {
      setIsRegistering(false);
      setPendingAction(null);
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
    <div className="@container bg-white rounded-lg shadow p-4 @md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pedido Atual</h2>
        {hasItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearOrder}
            disabled={isRegistering}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Order Items List */}
      <div className="space-y-2 min-h-[200px]">
        {currentItems.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-400">
            <p>Sem artigos no pedido</p>
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
          Observações (opcional)
        </label>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Adicione instruções especiais ou notas..."
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

      {/* Botões: empilhados quando o painel é estreito, lado a lado quando há espaço
          (container query: depende da largura do painel, não do ecrã) */}
      <div className="grid grid-cols-1 @md:grid-cols-3 gap-2">
        <Button
          onClick={() => handleRegisterOrder(false)}
          disabled={!hasItems || isRegistering}
          size="lg"
          className="w-full h-auto min-h-11 py-2 whitespace-normal leading-tight"
        >
          {pendingAction === 'order' ? 'A registar...' : 'Registar Pedido'}
        </Button>

        <Button
          onClick={() => handleRegisterOrder(true)}
          disabled={!hasItems || isRegistering}
          variant="secondary"
          size="lg"
          className="w-full h-auto min-h-11 py-2 whitespace-normal leading-tight"
        >
          <Printer className="h-4 w-4 mr-2 shrink-0" />
          {pendingAction === 'print' ? 'A registar...' : 'Registar e Imprimir'}
        </Button>

        <Button
          onClick={handleRegisterComplimentary}
          disabled={!hasItems || isRegistering}
          variant="outline"
          size="lg"
          className="w-full h-auto min-h-11 py-2 whitespace-normal leading-tight"
        >
          <Gift className="h-4 w-4 mr-2 shrink-0" />
          {pendingAction === 'offer' ? 'A registar...' : 'Registar Oferta'}
        </Button>
      </div>
    </div>
  );
});

OrderPanel.displayName = 'OrderPanel';
