/**
 * StockAdjustmentForm Component
 * 
 * Form for manually adjusting stock levels for menu items.
 * Validates that the new stock level is a non-negative integer and provides
 * immediate feedback with confirmation messages.
 * 
 * Requirements:
 * - 8.3: Allow manual stock adjustments
 * - 8.4: Validate non-negative integer stock levels
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
import { Loader2, CheckCircle2, AlertCircle, Package } from 'lucide-react';

interface StockAdjustmentFormProps {
  /**
   * Menu item to adjust stock for
   */
  item: MenuItem;
  
  /**
   * Callback when stock adjustment is successful
   */
  onSuccess?: (newLevel: number) => void;
  
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
 * StockAdjustmentForm component
 * 
 * Provides a form to manually adjust stock levels with validation and confirmation
 */
export function StockAdjustmentForm({
  item,
  onSuccess,
  onCancel,
  className = '',
}: StockAdjustmentFormProps) {
  // State
  const [newStockLevel, setNewStockLevel] = useState<string>(item.stockLevel.toString());
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Reset success state when item changes
   */
  useEffect(() => {
    setNewStockLevel(item.stockLevel.toString());
    setReason('');
    setError(null);
    setSuccess(false);
    setValidationError(null);
  }, [item.id, item.stockLevel]);

  /**
   * Validate stock level input
   * Requirement 8.4: Non-negative integer validation
   */
  const validateStockLevel = (value: string): boolean => {
    setValidationError(null);

    // Check if empty
    if (value.trim() === '') {
      setValidationError('O nível de stock é obrigatório');
      return false;
    }

    // Check if valid number
    const numValue = Number(value);
    if (isNaN(numValue)) {
      setValidationError('O nível de stock deve ser um número');
      return false;
    }

    // Check if integer
    if (!Number.isInteger(numValue)) {
      setValidationError('O nível de stock deve ser um número inteiro');
      return false;
    }

    // Check if non-negative
    if (numValue < 0) {
      setValidationError('O nível de stock não pode ser negativo');
      return false;
    }

    return true;
  };

  /**
   * Handle stock level input change
   */
  const handleStockLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewStockLevel(value);
    
    // Clear errors when user starts typing
    if (error) setError(null);
    if (validationError) setValidationError(null);
    if (success) setSuccess(false);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    if (!validateStockLevel(newStockLevel)) {
      return;
    }

    const stockValue = Number(newStockLevel);

    // Check if value actually changed
    if (stockValue === item.stockLevel) {
      setValidationError('O novo nível de stock é igual ao atual');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      // Requirement 8.3: Adjust stock immediately
      await stockService.adjustStock(
        item.id,
        stockValue,
        reason.trim() || undefined
      );

      // Show success message
      setSuccess(true);

      // Call success callback
      if (onSuccess) {
        onSuccess(stockValue);
      }

      // Reset form after brief delay
      setTimeout(() => {
        setReason('');
        setSuccess(false);
      }, 2000);

    } catch (err) {
      console.error('Failed to adjust stock:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Falha ao ajustar o stock. Por favor, tente novamente.';
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    setNewStockLevel(item.stockLevel.toString());
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
   * Calculate stock change
   */
  const stockChange = newStockLevel.trim() && !isNaN(Number(newStockLevel))
    ? Number(newStockLevel) - item.stockLevel
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>Ajustar Stock</CardTitle>
            <CardDescription>
              Atualizar o nível de stock para <strong>{item.name}</strong>
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

          {/* New Stock Level Input */}
          <div className="space-y-2">
            <Label htmlFor="newStockLevel">
              Novo Nível de Stock <span className="text-destructive">*</span>
            </Label>
            <Input
              id="newStockLevel"
              type="number"
              min="0"
              step="1"
              value={newStockLevel}
              onChange={handleStockLevelChange}
              disabled={isSubmitting}
              className={validationError ? 'border-destructive' : ''}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'stockLevel-error' : undefined}
              placeholder="Introduza o novo nível de stock"
              required
            />
            {validationError && (
              <p 
                id="stockLevel-error" 
                className="text-sm text-destructive flex items-center gap-1"
                role="alert"
              >
                <AlertCircle className="h-3 w-3" />
                {validationError}
              </p>
            )}
          </div>

          {/* Stock Change Preview */}
          {stockChange !== 0 && !validationError && (
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Alteração:</span>
                <span 
                  className={`font-semibold ${
                    stockChange > 0 ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {stockChange > 0 ? '+' : ''}{stockChange}
                </span>
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo (opcional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ex: Reabastecimento, Correção de inventário, etc."
              rows={3}
              maxLength={200}
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
                Stock ajustado com sucesso! Novo nível: {newStockLevel}
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
              Repor
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || !!validationError || stockChange === 0}
              className="sm:flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default StockAdjustmentForm;
