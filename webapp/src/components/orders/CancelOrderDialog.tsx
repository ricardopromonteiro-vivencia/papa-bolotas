/**
 * CancelOrderDialog Component
 * 
 * Modal dialog for cancelling orders with security code verification.
 * 
 * Features:
 * - Security code input and validation
 * - Order confirmation details
 * - Stock restoration information
 * - Error handling and user feedback
 * 
 * Requirements:
 * - 7.1: Provide order cancellation function
 * - 7.2: Request security code
 * - 7.3: Validate security code
 * - 7.4: Display cancellable orders
 * - 7.5: Restore stock levels
 * - 7.6: Set order total to 0
 * - 7.7: Mark order as cancelled
 * - 7.8: Generate cancellation receipt
 */

import { useState } from 'react';
import { Order } from '@/types';
import { orderService } from '@/services';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock, XCircle } from 'lucide-react';

interface CancelOrderDialogProps {
  /** Order to be cancelled */
  order: Order | null;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when order is successfully cancelled */
  onSuccess: (order: Order) => void;
  /** Optional user ID performing the cancellation */
  userId?: string;
}

export const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
  userId,
}) => {
  // State
  const [securityCode, setSecurityCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reset dialog state
   */
  const resetDialog = () => {
    setSecurityCode('');
    setError(null);
    setIsProcessing(false);
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isProcessing) {
      resetDialog();
      onClose();
    }
  };

  /**
   * Handle security code input
   */
  const handleSecurityCodeChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    // Limit to 6 digits
    setSecurityCode(digitsOnly.slice(0, 6));
    // Clear error when user types
    if (error) {
      setError(null);
    }
  };

  /**
   * Handle order cancellation
   * 
   * Requirements:
   * - 7.2: Request security code
   * - 7.3: Validate security code and handle errors
   * - 7.5-7.7: Cancel order (via service)
   */
  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      setError(null);
      setIsProcessing(true);

      // Validate security code is entered
      if (!securityCode) {
        setError('Please enter the security code');
        setIsProcessing(false);
        return;
      }

      // Validate format (4-6 digits)
      if (securityCode.length < 4) {
        setError('Security code must be at least 4 digits');
        setIsProcessing(false);
        return;
      }

      // Call cancellation service
      // This will:
      // - Validate the security code (Req 7.3)
      // - Restore stock levels (Req 7.5)
      // - Set total to 0 (Req 7.6)
      // - Mark as cancelled (Req 7.7)
      await orderService.cancelOrder(order.id, securityCode, userId);

      // Get updated order for callback
      const updatedOrder = await orderService.getOrder(order.id);
      
      if (!updatedOrder) {
        throw new Error('Failed to retrieve cancelled order');
      }

      // Notify parent component of success
      onSuccess(updatedOrder);

      // Close dialog
      resetDialog();
      onClose();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(message);
      setIsProcessing(false);
    }
  };

  /**
   * Handle keyboard events (Enter to submit)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && securityCode.length >= 4 && !isProcessing) {
      handleCancelOrder();
    }
  };

  if (!order) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Cancel Order #{order.orderNumber}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action will cancel the order and restore stock levels.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-semibold">#{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold">€{order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items:</span>
              <span className="font-semibold">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Created:</span>
              <span className="font-semibold">
                {order.createdAt.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Stock Restoration Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Stock will be restored:</strong> All items from this order will be 
              returned to inventory.
            </p>
          </div>

          {/* Security Code Input */}
          <div className="space-y-2">
            <Label htmlFor="security-code" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Security Code
            </Label>
            <Input
              id="security-code"
              type="password"
              inputMode="numeric"
              placeholder="Enter 4-6 digit code"
              value={securityCode}
              onChange={(e) => handleSecurityCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Enter the security code to authorize this cancellation
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelOrder}
            disabled={isProcessing || securityCode.length < 4}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isProcessing ? 'Cancelling...' : 'Cancel Order'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelOrderDialog;
