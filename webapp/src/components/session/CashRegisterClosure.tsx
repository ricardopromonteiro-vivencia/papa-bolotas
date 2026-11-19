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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session statistics';
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
        throw new Error('Please enter a valid cash amount');
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to close cash register';
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
        <div className="text-center text-gray-600">Loading session data...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Cash Register Closure</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {statistics && (
        <div className="space-y-6">
          {/* Session Summary */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3">Session Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Completed Orders</p>
                <p className="text-xl font-bold">{statistics.completedOrders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold">€{expectedCash.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Complimentary Orders</p>
                <p className="text-xl">{statistics.complimentaryOrders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cancelled Orders</p>
                <p className="text-xl">{statistics.cancelledOrders}</p>
              </div>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cash Reconciliation</h3>

            {/* Expected Cash */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <Label className="text-sm text-blue-900">Expected Cash</Label>
              <p className="text-2xl font-bold text-blue-900">€{expectedCash.toFixed(2)}</p>
              <p className="text-xs text-blue-700 mt-1">
                Based on {statistics.completedOrders} completed orders
              </p>
            </div>

            {/* Actual Cash Input */}
            <div>
              <Label htmlFor="actualCash">Actual Cash Count</Label>
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
                  Discrepancy
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
                    ? 'Perfect match! Cash register balanced.'
                    : discrepancy > 0
                    ? 'Cash surplus detected.'
                    : 'Cash shortage detected.'}
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
                {isLoading ? 'Closing...' : 'Close Cash Register'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Cash Register Closure</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>Are you sure you want to close the cash register?</p>
                    <div className="bg-gray-100 p-3 rounded mt-3 space-y-1">
                      <p className="font-semibold">Summary:</p>
                      <p>Expected Cash: €{expectedCash.toFixed(2)}</p>
                      <p>Actual Cash: €{parseFloat(actualCash).toFixed(2)}</p>
                      {discrepancy !== null && (
                        <p className={discrepancy === 0 ? 'text-green-600' : discrepancy > 0 ? 'text-yellow-600' : 'text-red-600'}>
                          Discrepancy: {discrepancy > 0 ? '+' : ''}€{discrepancy.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <p className="mt-3 text-sm">
                      This will finalize the current session and reset the order counter.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCloseCashRegister}
                  disabled={isLoading}
                >
                  {isLoading ? 'Closing...' : 'Confirm Closure'}
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
