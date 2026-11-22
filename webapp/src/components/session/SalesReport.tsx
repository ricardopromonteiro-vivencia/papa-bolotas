import { useEffect, useState } from 'react';
import { 
  Clock, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import { salesReportService } from '@/services/sales-report.service';
import type { FormattedSalesReport } from '@/services/sales-report.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * SalesReport Component
 * 
 * Displays comprehensive sales report for a session including:
 * - Total revenue
 * - Order counts by type (completed, complimentary, cancelled)
 * - Item sales breakdown table sorted by revenue
 * - Session start time and duration
 * - Real-time updates as orders are processed
 * 
 * Requirements:
 * - 10.1: Generate sales report for current session
 * - 10.2: Display total revenue (excluding complimentary/cancelled)
 * - 10.6: List menu items sold with quantities and subtotals
 * - 10.7: Display session start time and current time
 * - 10.8: Calculate sales statistics in real-time
 * 
 * @param sessionId - ID of the session to display report for
 * @param autoRefresh - Whether to auto-refresh statistics (default: true)
 * @param refreshInterval - Refresh interval in ms (default: 30000)
 */
interface SalesReportProps {
  sessionId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Format date and time in Portuguese locale
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function SalesReport({ 
  sessionId, 
  autoRefresh = true,
  refreshInterval = 30000 
}: SalesReportProps) {
  const [report, setReport] = useState<FormattedSalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load and refresh sales report
  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      try {
        if (isMounted) {
          setError(null);
        }

        const reportData = await salesReportService.generateFormattedReport(sessionId);

        if (isMounted) {
          setReport(reportData);
          setLastUpdated(new Date());
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load sales report:', err);
          setError(err instanceof Error ? err.message : 'Falha ao carregar o relatório de vendas');
          setLoading(false);
        }
      }
    }

    // Initial load
    loadReport();

    // Set up auto-refresh
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadReport();
      }, refreshInterval);
    }

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sessionId, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Relatório de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Erro ao Carregar Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">
            {error || 'Não foi possível carregar o relatório de vendas'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Vendas
            </div>
            {lastUpdated && (
              <span className="text-xs font-normal text-gray-500">
                Atualizado: {formatDateTime(lastUpdated)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Início da Sessão
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {formatDateTime(report.sessionStart)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Duração
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 font-mono">
                  {report.sessionDuration}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-600" aria-hidden="true" />
                <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />
              </div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Receita Total
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {report.formattedRevenue}
              </p>
            </div>

            {/* Completed Orders */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Pedidos Concluídos
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {report.completedOrders}
              </p>
            </div>

            {/* Complimentary Orders */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-amber-600" aria-hidden="true" />
              </div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Oferta
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {report.complimentaryOrders}
              </p>
            </div>

            {/* Cancelled Orders */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
              </div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Cancelado
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {report.cancelledOrders}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Sales Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalhe de Vendas por Artigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.topSellingItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ainda não foram vendidos artigos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Nome do Artigo
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Quantidade
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.topSellingItems.map((item, index) => (
                    <tr 
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-right font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right font-semibold">
                        {item.formattedSubtotal}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="py-3 px-4 text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right font-mono">
                      {report.topSellingItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">
                      {report.formattedRevenue}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 mb-1">
                Total de Pedidos Processados
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {report.totalOrders}
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-600 mb-1">
                Receita da Sessão
              </p>
              <p className="text-3xl font-bold text-green-600">
                {report.formattedRevenue}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
