import { useEffect, useState } from 'react';
import { ChevronDown, Clock, DollarSign, ShoppingCart, Wifi, WifiOff } from 'lucide-react';

const COLLAPSED_KEY = 'papa-bolotas.sessionStatus.collapsed';
import { useConnectionStore } from '@/store';
import { sessionService } from '@/services/session.service';
import type { Session, SalesReport } from '@/types';

/**
 * SessionStatusDisplay Component
 * 
 * Displays real-time session information including:
 * - Session start time
 * - Session duration (auto-updating)
 * - Running order count
 * - Running revenue
 * - Connection status indicator
 * 
 * Requirements:
 * - 19.4: Display session duration in the interface
 * - 3.5: Display the current connection status (online/offline) to the Admin_User
 * 
 * @param sessionId - ID of the active session to display
 */
interface SessionStatusDisplayProps {
  sessionId: string;
}

/**
 * Format duration in HH:MM:SS
 */
function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

/**
 * Format date and time
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

export function SessionStatusDisplay({ sessionId }: SessionStatusDisplayProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [statistics, setStatistics] = useState<SalesReport | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  // Recolhido/expandido: fica lembrado neste aparelho
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      try { localStorage.setItem(COLLAPSED_KEY, prev ? '0' : '1'); } catch { /* ignorar */ }
      return !prev;
    });
  };
  const [error, setError] = useState<string | null>(null);
  
  const { status, isFullyConnected } = useConnectionStore();

  // Load session and statistics
  useEffect(() => {
    let isMounted = true;

    async function loadSessionData() {
      try {
        setLoading(true);
        setError(null);

        // Load session details
        const sessionData = await sessionService.getSession(sessionId);
        
        // Load session statistics
        const stats = await sessionService.getSessionStatistics(sessionId);

        if (isMounted) {
          setSession(sessionData);
          setStatistics(stats);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load session data:', err);
          setError('Falha ao carregar dados da sessão');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSessionData();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Update duration every second
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = session.startedAt.getTime();
      setDuration(now - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Refresh statistics periodically (every 30 seconds)
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const stats = await sessionService.getSessionStatistics(sessionId);
        setStatistics(stats);
      } catch (err) {
        console.error('Failed to refresh statistics:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        role="status"
        aria-label="A carregar estado da sessão"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !session || !statistics) {
    return (
      <div 
        className="bg-red-50 rounded-lg border border-red-200 p-4"
        role="alert"
      >
        <p className="text-red-600 text-sm">
          {error || 'Não foi possível carregar as informações da sessão'}
        </p>
      </div>
    );
  }

  const fullyConnected = isFullyConnected();

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      role="region"
      aria-label="Estado da sessão"
    >
      {/* Cabeçalho: clicar em "Estado da Sessão" recolhe/expande o quadro */}
      <div className={`flex items-center justify-between gap-3 ${collapsed ? '' : 'mb-4'}`}>
        <h3 className="text-lg font-semibold text-gray-900">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="session-status-details"
            title={collapsed ? 'Mostrar detalhes da sessão' : 'Esconder detalhes da sessão'}
            className="flex items-center gap-1.5 rounded hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            Estado da Sessão
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              aria-hidden="true"
            />
          </button>
        </h3>
        
        {/* Connection Indicator */}
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            ${fullyConnected 
              ? 'bg-green-100 text-green-700' 
              : status.isOnline 
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
            }
          `}
          role="status"
          aria-live="polite"
          aria-label={`Estado da ligação: ${fullyConnected ? 'online' : 'offline'}`}
        >
          {fullyConnected ? (
            <Wifi className="w-4 h-4" aria-hidden="true" />
          ) : (
            <WifiOff className="w-4 h-4" aria-hidden="true" />
          )}
          <span>
            {fullyConnected ? 'Online' : status.isOnline ? 'Problema na BD' : 'Offline'}
          </span>
        </div>
      </div>

      {!collapsed && (
      <div id="session-status-details">
      {/* Session Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session Start Time */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Início da Sessão
            </p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {formatDateTime(session.startedAt)}
            </p>
          </div>
        </div>

        {/* Session Duration */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Duração
            </p>
            <p 
              className="text-sm font-medium text-gray-900 mt-0.5 font-mono"
              aria-live="off"
              aria-atomic="true"
            >
              {formatDuration(duration)}
            </p>
          </div>
        </div>

        {/* Order Count */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-green-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Pedidos
            </p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {statistics.completedOrders}
              {statistics.complimentaryOrders > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  (+{statistics.complimentaryOrders} ofertas)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Revenue */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-amber-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Receita
            </p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {formatCurrency(statistics.totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Additional info for cancelled orders if any */}
      {statistics.cancelledOrders > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {statistics.cancelledOrders} {statistics.cancelledOrders !== 1 ? 'pedidos cancelados' : 'pedido cancelado'}
          </p>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
