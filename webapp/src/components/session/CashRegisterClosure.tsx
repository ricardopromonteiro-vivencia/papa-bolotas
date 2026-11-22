/**
 * Cash Register Closure Component
 * 
 * Provides interface for closing the cash register at end of shift.
 * Displays expected cash from orders, allows inputting actual cash count,
 * calculates discrepancy, and saves session record on confirmation.
 * 
 * Requirements:
 * - 11.2: Display expected cash amount based on registered orders
 * - 11.3: Allow the user to input actual cash count
 * - 11.4: Calculate and display any cash discrepancy
 * - 11.5: Save the session record permanently
 * - 11.6: Reset the order counter for the next session
 * - 11.7: Ensure all data is synchronized to Supabase in Online Mode
 */

import { useState, useEffect } from 'react';
import { sessionService } from '@/services/session.service';
import { Session, SalesReport } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CashRegisterClosureProps {
  sessionId: string;
  onSuccess?: (session: Session) => void;
  onError?: (error: Error) => void;
}

/**
 * CashRegisterClosure component
 * 
 * Handles the end-of-shift cash register closure process.
 */
export function CashRegisterClosure({
  sessionId,
  onSuccess,
  onError
}: CashRegisterClosureProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<SalesReport | null>(null);
  const [actualCash, setActualCash] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load session statistics on mount
  useEffect(() => {
    loadStatistics();
  }, [sessionId]);

  /**
   * Load session statistics to calculate expected cash
   */
  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await sessionService.getSessionStatistics(sessionId);
      setStatistics(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao carregar estatísticas da sessão';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate expected cash from completed orders (excluding complimentary and cancelled)
   */
  const calculateExpectedCash = (): number => {
    if (!statistics) return 0;
    return statistics.totalRevenue;
  };

  /**
   * Calculate discrepancy between actual and expected cash
   */
  const calculateDiscrepancy = (): number | null => {
    const actual = parseFloat(actualCash);
    if (isNaN(actual)) return null;
    return actual - calculateExpectedCash();
  };

  /**
   * Validate actual cash input
   */
  const isValidActualCash = (): boolean => {
    const actual = parseFloat(actualCash);
    return !isNaN(actual) && actual >= 0;
  };

  /**
   * Handle cash register closure
   */
  const handleCloseCashRegister = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const actual = parseFloat(actualCash);
      if (!isValidActualCash()) {
        throw new Error('Por favor, introduza um valor em dinheiro válido');
      }

      // Call SessionService to end the session
      const closedSession = await sessionService.endSession(sessionId, actual);

      // Success callback
      if (onSuccess) {
        onSuccess(closedSession);
      }

      // Close dialog
      setIsDialogOpen(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao fechar a caixa';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const expectedCash = calculateExpectedCash();
  const discrepancy = calculateDiscrepancy();

  if (isLoading && !statistics) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">A carregar dados da sessão...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Fecho de Caixa</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {statistics && (
        <div className="space-y-6">
          {/* Session Summary */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3">Resumo da Sessão</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Pedidos Concluídos</p>
                <p className="text-xl font-bold">{statistics.completedOrders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-xl font-bold">€{expectedCash.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pedidos de Oferta</p>
                <p className="text-xl">{statistics.complimentaryOrders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pedidos Cancelados</p>
                <p className="text-xl">{statistics.cancelledOrders}</p>
              </div>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reconciliação de Caixa</h3>

            {/* Expected Cash */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <Label className="text-sm text-blue-900">Dinheiro Esperado</Label>
              <p className="text-2xl font-bold text-blue-900">€{expectedCash.toFixed(2)}</p>
              <p className="text-xs text-blue-700 mt-1">
                Com base em {statistics.completedOrders} pedidos concluídos
              </p>
            </div>

            {/* Actual Cash Input */}
            <div>
              <Label htmlFor="actualCash">Dinheiro Contado</Label>
              <Input
                id="actualCash"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="text-xl font-semibold mt-2"
              />
            </div>

            {/* Discrepancy Display */}
            {discrepancy !== null && isValidActualCash() && (
              <div
                className={`p-4 rounded-lg ${
                  discrepancy === 0
                    ? 'bg-green-50'
                    : discrepancy > 0
                    ? 'bg-yellow-50'
                    : 'bg-red-50'
                }`}
              >
                <Label
                  className={`text-sm ${
                    discrepancy === 0
                      ? 'text-green-900'
                      : discrepancy > 0
                      ? 'text-yellow-900'
                      : 'text-red-900'
                  }`}
                >
                  Diferença
                </Label>
                <p
                  className={`text-2xl font-bold ${
                    discrepancy === 0
                      ? 'text-green-900'
                      : discrepancy > 0
                      ? 'text-yellow-900'
                      : 'text-red-900'
                  }`}
                >
                  {discrepancy > 0 ? '+' : ''}€{discrepancy.toFixed(2)}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    discrepancy === 0
                      ? 'text-green-700'
                      : discrepancy > 0
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }`}
                >
                  {discrepancy === 0
                    ? 'Valor exato! Caixa equilibrada.'
                    : discrepancy > 0
                    ? 'Excedente de dinheiro detetado.'
                    : 'Falta de dinheiro detetada.'}
                </p>
              </div>
            )}
          </div>

          {/* Close Cash Register Button with Confirmation */}
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                size="lg"
                disabled={!isValidActualCash() || isLoading}
              >
                {isLoading ? 'A fechar...' : 'Fechar Caixa'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Fecho de Caixa</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>Tem a certeza de que pretende fechar a caixa?</p>
                    <div className="bg-gray-100 p-3 rounded mt-3 space-y-1">
                      <p className="font-semibold">Resumo:</p>
                      <p>Dinheiro Esperado: €{expectedCash.toFixed(2)}</p>
                      <p>Dinheiro Contado: €{parseFloat(actualCash).toFixed(2)}</p>
                      {discrepancy !== null && (
                        <p className={discrepancy === 0 ? 'text-green-600' : discrepancy > 0 ? 'text-yellow-600' : 'text-red-600'}>
                          Diferença: {discrepancy > 0 ? '+' : ''}€{discrepancy.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <p className="mt-3 text-sm">
                      Isto irá finalizar a sessão atual e repor o contador de pedidos.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCloseCashRegister}
                  disabled={isLoading}
                >
                  {isLoading ? 'A fechar...' : 'Confirmar Fecho'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
}

export default CashRegisterClosure;
