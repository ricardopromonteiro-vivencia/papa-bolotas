/**
 * Reports Page - Sales reports
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionService } from '@/services/session.service';
import { SalesReport } from '@/components/session/SalesReport';
import { Session } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user) return;
      try {
        // Try active session first
        const active = await sessionService.getActiveSession(user.id);
        if (active) {
          setSessions([active]);
          setSelectedSessionId(active.id);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Relatórios de Vendas</h1>

      {sessions.length > 1 && (
        <div className="mb-6">
          <Label htmlFor="session-select">Sessão</Label>
          <Select
            value={selectedSessionId ?? ''}
            onValueChange={setSelectedSessionId}
          >
            <SelectTrigger id="session-select" className="w-72 mt-1">
              <SelectValue placeholder="Selecionar sessão..." />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {new Date(s.startedAt).toLocaleDateString('pt-PT')} —{' '}
                  {s.isActive ? 'Ativa' : 'Fechada'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedSessionId ? (
        <SalesReport sessionId={selectedSessionId} />
      ) : (
        <div className="text-center py-16 text-gray-500">
          <p>Nenhuma sessão encontrada.</p>
          <p className="text-sm mt-1">Crie um pedido no POS para iniciar uma sessão.</p>
        </div>
      )}
    </div>
  );
}
