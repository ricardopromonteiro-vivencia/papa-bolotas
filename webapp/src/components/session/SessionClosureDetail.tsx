/**
 * SessionClosureDetail
 *
 * Detalhe de uma sessão (fecho de caixa) para consulta:
 * - resumo de receita e número de pedidos
 * - quantidades vendidas e oferecidas por artigo (somatório)
 * - lista completa dos pedidos, com artigos, observações e estado
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Order, Session } from '@/types';
import { sessionService } from '@/services/session.service';
import { orderService } from '@/services/order.service';
import { summarizeOrders, buildSessionReportText } from '@/lib/session-report';
import { printReceipt } from '@/lib/print-receipt';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionClosureDetailProps {
  session: Session;
}

const euro = (value: number) => `€${value.toFixed(2)}`;
const time = (date: Date) =>
  new Date(date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

export function SessionClosureDetail({ session }: SessionClosureDetailProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromLocalCopy, setFromLocalCopy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await sessionService.getSessionOrderDetails(session.id));
      setFromLocalCopy(false);
    } catch (err) {
      // Sem ligação ao Supabase: usa a cópia local do browser (pode estar incompleta)
      console.warn('Falling back to local orders:', err);
      try {
        setOrders(await orderService.getSessionOrders(session.id));
        setFromLocalCopy(true);
      } catch {
        setError('Não foi possível carregar os pedidos desta sessão.');
      }
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    load();
  }, [load]);

  const { paid, offered, cancelled, revenue, items, totals } = useMemo(() => summarizeOrders(orders), [orders]);

  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  const handlePrint = async () => {
    setPrinting(true);
    setPrintMessage(null);
    try {
      const title = session.isActive ? 'Relatório parcial' : 'Relatório de fecho de caixa';
      const how = await printReceipt(buildSessionReportText(session, orders), title);
      if (how === 'thermal') setPrintMessage('Relatório enviado para a impressora.');
    } catch (err) {
      console.error('Failed to print report:', err);
      setPrintMessage(`Não foi possível imprimir: ${(err as Error).message || 'erro desconhecido'}`);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> A carregar pedidos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-800 flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {fromLocalCopy ? (
          <p className="text-sm text-amber-700">
            Sem ligação: a mostrar a cópia local, que pode estar incompleta.
          </p>
        ) : printMessage ? (
          <p className={cn('text-sm', printMessage.startsWith('Não') ? 'text-red-700' : 'text-green-700')}>
            {printMessage}
          </p>
        ) : <span />}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={load} disabled={printing}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={handlePrint} disabled={printing}>
            {printing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
            Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Receita', value: euro(revenue) },
          { label: 'Pedidos pagos', value: paid.length },
          { label: 'Ofertas', value: offered.length },
          { label: 'Cancelados', value: cancelled.length },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quantidades por artigo */}
      <section className="bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold px-4 pt-4 pb-2">Quantidades por Artigo</h3>
        {items.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-gray-500">Nenhum artigo vendido nesta sessão.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Artigo</th>
                  <th className="text-right font-medium px-4 py-2">Vendidos</th>
                  <th className="text-right font-medium px-4 py-2">Ofertas</th>
                  <th className="text-right font-medium px-4 py-2">Total vendido</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.name} className="border-t">
                    <td className="px-4 py-2">{i.name}</td>
                    <td className="px-4 py-2 text-right">{i.sold}</td>
                    <td className="px-4 py-2 text-right">{i.offered || '—'}</td>
                    <td className="px-4 py-2 text-right">{euro(i.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 font-semibold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{totals.sold}</td>
                  <td className="px-4 py-2 text-right">{totals.offered || '—'}</td>
                  <td className="px-4 py-2 text-right">{euro(totals.revenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="px-4 py-3 text-xs text-gray-500">
          Os pedidos cancelados não entram nestas quantidades.
        </p>
      </section>

      {/* Lista de pedidos */}
      <section className="bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold px-4 pt-4 pb-2">Pedidos ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-gray-500">Nenhum pedido registado nesta sessão.</p>
        ) : (
          <ul>
            {orders.map(order => {
              const status = order.isCancelled
                ? { label: 'Cancelado', cls: 'bg-red-100 text-red-800' }
                : order.isComplimentary
                ? { label: 'Oferta', cls: 'bg-green-100 text-green-800' }
                : { label: 'Pago', cls: 'bg-gray-100 text-gray-800' };

              return (
                <li key={order.id} className="border-t px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{order.orderNumber}</span>
                      <span className="text-sm text-gray-500">{time(order.createdAt)}</span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', status.cls)}>
                        {status.label}
                      </span>
                    </div>
                    <span className={cn('font-semibold', order.isCancelled && 'line-through text-gray-400')}>
                      {euro(order.total)}
                    </span>
                  </div>

                  <ul className={cn('mt-2 space-y-0.5 text-sm', order.isCancelled && 'line-through text-gray-400')}>
                    {order.items.map(item => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.quantity} × {item.menuItemName}</span>
                        <span className="text-gray-600">
                          {euro(item.unitPrice)} = {euro(item.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {order.observations && (
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Observações:</span> {order.observations}
                    </p>
                  )}
                  {order.isCancelled && order.cancelledAt && (
                    <p className="mt-1 text-xs text-red-700">Cancelado às {time(order.cancelledAt)}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default SessionClosureDetail;
