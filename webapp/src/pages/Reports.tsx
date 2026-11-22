/**
 * Página de Relatórios - histórico de fechos de caixa e relatório de vendas por sessão
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionService } from '@/services/session.service';
import { SessionClosureDetail } from '@/components/session/SessionClosureDetail';
import { Session } from '@/types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatDateTime = (date?: Date) =>
  date
    ? new Date(date).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

const formatEuro = (value?: number) =>
  value === undefined || value === null ? '—' : `€${Number(value).toFixed(2)}`;

function discrepancyClass(value?: number) {
  if (value === undefined || value === null) return 'text-gray-500';
  if (Math.abs(value) < 0.005) return 'text-green-700';
  return value > 0 ? 'text-blue-700' : 'text-red-700';
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadSessions = async () => {
      try {
        setError(null);
        // Sessões ordenadas da mais recente para a mais antiga
        const all = await sessionService.getUserSessions(user.id, 200);
        setSessions(all);

        // Por omissão mostra o último fecho de caixa; se ainda não houver, a sessão aberta
        const lastClosed = all.find(s => !s.isActive);
        setSelectedSessionId((lastClosed ?? all[0])?.id ?? null);
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setError('Não foi possível carregar o histórico de sessões.');
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const selected = sessions.find(s => s.id === selectedSessionId) ?? null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Relatórios de Vendas</h1>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {sessions.length === 0 && !error ? (
        <div className="text-center py-16 text-gray-500">
          <p>Nenhuma sessão encontrada.</p>
          <p className="text-sm mt-1">Registe um pedido em Vendas para iniciar uma sessão.</p>
        </div>
      ) : (
        <>
          {/* Histórico de fechos de caixa */}
          <section className="bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold px-4 pt-4">Histórico de Fechos de Caixa</h2>
            <p className="text-sm text-gray-500 px-4 pb-3">
              Clique numa linha para ver os pedidos e as quantidades vendidas dessa sessão.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Abertura</th>
                    <th className="text-left font-medium px-4 py-2">Fecho</th>
                    <th className="text-right font-medium px-4 py-2">Esperado</th>
                    <th className="text-right font-medium px-4 py-2">Contado</th>
                    <th className="text-right font-medium px-4 py-2">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={cn(
                        'border-t cursor-pointer hover:bg-orange-50',
                        s.id === selectedSessionId && 'bg-orange-100'
                      )}
                    >
                      <td className="px-4 py-2">{formatDateTime(s.startedAt)}</td>
                      <td className="px-4 py-2">
                        {s.isActive ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                            Sessão aberta
                          </span>
                        ) : (
                          formatDateTime(s.endedAt)
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">{formatEuro(s.expectedCash)}</td>
                      <td className="px-4 py-2 text-right">{formatEuro(s.actualCash)}</td>
                      <td className={cn('px-4 py-2 text-right font-medium', discrepancyClass(s.discrepancy))}>
                        {s.discrepancy !== undefined && s.discrepancy !== null && s.discrepancy > 0 ? '+' : ''}
                        {formatEuro(s.discrepancy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detalhe da sessão selecionada */}
          {selected && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">
                {selected.isActive
                  ? `Sessão aberta desde ${formatDateTime(selected.startedAt)}`
                  : `Fecho de caixa de ${formatDateTime(selected.endedAt)}`}
              </h2>
              <SessionClosureDetail key={selected.id} session={selected} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
