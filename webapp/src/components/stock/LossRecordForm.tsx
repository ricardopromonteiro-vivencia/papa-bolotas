/**
 * LossRecordForm Component
 * 
 * Form for recording product losses and breakages.
 * Validates quantity, warns about over-stock losses, and requires confirmation.
 * 
 * Requirements:
 * - 9.2: Require selecting menu item and quantity
 * - 9.3: Validate positive integer quantity
 * - 9.4: Warn if quantity exceeds current stock
 * - 9.5: Require confirmation for over-stock losses
 * - 9.6: Log loss event with timestamp
 */

import { useState, useEffect } from 'react';
import { MenuItem } from '@/types';
import { stockService } from '@/services/stock.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle, Package } from 'lucide-react';

interface LossRecordFormProps {
  /**
   * Menu item to record loss for
   */
  item: MenuItem;
  
  /**
   * Callback when loss is successfully recorded
   */
  onSuccess?: () => void;
  
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
  
  /**
   * Optional CSS classes
   */
  className?: string;
}

/**
 * LossRecordForm component
 * 
 * Provides a form to record losses and breakages with validation and confirmation
 */
export function LossRecordForm({
  item,
  onSuccess,
  onCancel,
  className = '',
}: LossRecordFormProps) {
  // State
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingQuantity, setPendingQuantity] = useState<number>(0);

  /**
   * Reset form when item changes
   */
  useEffect(() => {
    setQuantity('');
    setReason('');
    setError(null);
    setSuccess(false);
    setValidationError(null);
  }, [item.id]);

  /**
   * Validate quantity input
   * Requirement 9.3: Positive integer validation
   */
  const validateQuantity = (value: string): boolean => {
    setValidationError(null);

    // Check if empty
    if (value.trim() === '') {
      setValidationError('A quantidade é obrigatória');
      return false;
    }

    // Check if valid number
    const numValue = Number(value);
    if (isNaN(numValue)) {
      setValidationError('A quantidade deve ser um número');
      return false;
    }

    // Check if integer
    if (!Number.isInteger(numValue)) {
      setValidationError('A quantidade deve ser um número inteiro');
      return false;
    }

    // Requirement 9.3: Check if positive
    if (numValue <= 0) {
      setValidationError('A quantidade deve ser maior que zero');
      return false;
    }

    return true;
  };

  /**
   * Handle quantity input change
   */
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuantity(value);
    
    // Clear errors when user starts typing
    if (error) setError(null);
    if (validationError) setValidationError(null);
    if (success) setSuccess(false);
  };

  /**
   * Check if quantity exceeds current stock
   * Requirement 9.4: Warning for over-stock losses
   */
  const exceedsStock = (qty: number): boolean => {
    return qty > item.stockLevel;
  };

  /**
   * Record the loss
   */
  const recordLoss = async (qty: number) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      // Requirement 9.6: Log loss event with timestamp
      await stockService.recordLoss(
        item.id,
        qty,
        reason.trim() || 'Perda/Quebra registada'
      );

      // Show success message
      setSuccess(true);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Reset form after brief delay
      setTimeout(() => {
        setQuantity('');
        setReason('');
        setSuccess(false);
      }, 2000);

    } catch (err) {
      console.error('Failed to record loss:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Falha ao registar a perda. Por favor, tente novamente.';
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    if (!validateQuantity(quantity)) {
      return;
    }

    // Validate reason
    if (!reason.trim()) {
      setValidationError('O motivo é obrigatório');
      return;
    }

    const qtyValue = Number(quantity);

    // Requirement 9.4 & 9.5: Check if exceeds stock and require confirmation
    if (exceedsStock(qtyValue)) {
      setPendingQuantity(qtyValue);
      setShowConfirmDialog(true);
      return;
    }

    // Record loss directly if within stock
    await recordLoss(qtyValue);
  };

  /**
   * Handle confirmation of over-stock loss
   * Requirement 9.5: Confirmation for over-stock losses
   */
  const handleConfirmOverStock = async () => {
    setShowConfirmDialog(false);
    await recordLoss(pendingQuantity);
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    setQuantity('');
    setReason('');
    setError(null);
    setSuccess(false);
    setValidationError(null);
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    handleReset();
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Check if form has validation errors
   */
  const hasErrors = !!validationError;

  /**
   * Check if form is complete
   */
  const isFormComplete = quantity.trim() !== '' && reason.trim() !== '';

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>Registar Perda/Quebra</CardTitle>
              <CardDescription>
                Registar perda ou quebra para <strong>{item.name}</strong>
              </CardDescription>
            </div>
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Stock Level */}
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stock Atual:</span>
                <span className="text-lg font-semibold">{item.stockLevel}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantidade Perdida <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={handleQuantityChange}
                disabled={isSubmitting}
                className={validationError ? 'border-destructive' : ''}
                aria-invalid={!!validationError}
                aria-describedby={validationError ? 'quantity-error' : undefined}
                placeholder="Introduza a quantidade perdida"
                required
              />
              {validationError && (
                <p 
                  id="quantity-error" 
                  className="text-sm text-destructive flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="h-3 w-3" />
                  {validationError}
                </p>
              )}
            </div>

            {/* Warning if quantity exceeds stock */}
            {/* Requirement 9.4: Display warning if quantity exceeds current stock */}
            {quantity.trim() && 
             !isNaN(Number(quantity)) && 
             Number(quantity) > 0 && 
             exceedsStock(Number(quantity)) && (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>Aviso:</strong> A quantidade registada ({quantity}) excede o stock atual ({item.stockLevel}).
                  Será necessária confirmação adicional.
                </AlertDescription>
              </Alert>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ex: Quebra, Deterioração, Expirado, etc."
                rows={3}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/200 caracteres
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Perda registada com sucesso! Stock atualizado: {item.stockLevel - Number(quantity)}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="sm:flex-1"
                >
                  Cancelar
                </Button>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="sm:flex-1"
              >
                Limpar
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting || hasErrors || !isFormComplete}
                className="sm:flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A registar...
                  </>
                ) : (
                  'Registar Perda'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Over-Stock Losses */}
      {/* Requirement 9.5: Require confirmation for over-stock losses */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirmar Perda Acima do Stock
            </AlertDialogTitle>
            <AlertDialogDescription>
              A quantidade registada <strong>({pendingQuantity})</strong> excede o stock atual <strong>({item.stockLevel})</strong> para <strong>{item.name}</strong>.
              <br /><br />
              Isto irá resultar num stock negativo de <strong>{item.stockLevel - pendingQuantity}</strong>.
              <br /><br />
              Tem a certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOverStock}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A registar...
                </>
              ) : (
                'Confirmar Perda'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default LossRecordForm;
