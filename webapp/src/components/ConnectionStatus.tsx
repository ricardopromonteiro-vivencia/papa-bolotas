import { useEffect } from 'react';
import { useOnlineStatus } from '@/hooks';
import { checkConnection, monitorConnection } from '@/lib/supabase';
import { useConnectionStore } from '@/store';

/**
 * ConnectionStatus Component
 * Displays the current network connection status (online/offline)
 * and Supabase database connectivity
 * 
 * Automatically updates when connection state changes
 * Stores connection state in Zustand store for global access
 * 
 * @returns Connection status indicator element
 */
export function ConnectionStatus() {
  const isOnline = useOnlineStatus();
  const { status, setOnline, setSupabaseConnected, isFullyConnected } = useConnectionStore();

  useEffect(() => {
    // Update online status in store when it changes
    setOnline(isOnline);

    // Only check Supabase connection if online
    if (!isOnline) {
      setSupabaseConnected(false);
      return;
    }

    // Perform initial connection check
    checkConnection().then(result => {
      setSupabaseConnected(result.isConnected, result.latency ?? undefined);
    });

    // Monitor connection health
    const cleanup = monitorConnection(30000, ({ isConnected, latency }) => {
      setSupabaseConnected(isConnected, latency ?? undefined);
    });

    return cleanup;
  }, [isOnline, setOnline, setSupabaseConnected]);

  // Determine overall status
  const fullyConnected = isFullyConnected();
  const showWarning = isOnline && !status.isSupabaseConnected;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 
        px-4 py-2 rounded-lg shadow-lg
        flex items-center gap-2
        transition-all duration-300
        ${fullyConnected 
          ? 'bg-green-500 text-white' 
          : showWarning
          ? 'bg-yellow-500 text-white'
          : 'bg-red-500 text-white'
        }
      `}
      role="status"
      aria-live="polite"
    >
      <span
        className={`
          w-3 h-3 rounded-full
          ${fullyConnected 
            ? 'bg-white' 
            : 'bg-white animate-pulse'
          }
        `}
        aria-hidden="true"
      />
      <div className="flex flex-col">
        <span className="font-medium">
          {fullyConnected 
            ? 'Online' 
            : showWarning
            ? 'Online (Problema na BD)'
            : 'Offline'
          }
        </span>
        {status.latency && fullyConnected && (
          <span className="text-xs opacity-90">
            {status.latency}ms
          </span>
        )}
      </div>
    </div>
  );
}
