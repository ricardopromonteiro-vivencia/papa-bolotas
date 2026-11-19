import { create } from 'zustand';
import type { ConnectionStatus } from '@/types';

/**
 * Connection Store State Interface
 * Manages global connection status state
 */
interface ConnectionState {
  /** Current connection status */
  status: ConnectionStatus;
  
  /** Update the connection status */
  setStatus: (status: Partial<ConnectionStatus>) => void;
  
  /** Set online status */
  setOnline: (isOnline: boolean) => void;
  
  /** Set Supabase connection status */
  setSupabaseConnected: (isConnected: boolean, latency?: number) => void;
  
  /** Check if fully connected (both online and Supabase connected) */
  isFullyConnected: () => boolean;
}

/**
 * Zustand store for managing connection state
 * 
 * This store provides a centralized place to manage the application's
 * connection status, including network connectivity and Supabase connection health.
 * 
 * @example
 * ```tsx
 * import { useConnectionStore } from '@/store';
 * 
 * function MyComponent() {
 *   const { status, setOnline, isFullyConnected } = useConnectionStore();
 *   
 *   return (
 *     <div>
 *       {isFullyConnected() ? 'Connected' : 'Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // Initial state
  status: {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSupabaseConnected: false,
    lastChecked: new Date(),
  },

  // Update status with partial updates
  setStatus: (updates: Partial<ConnectionStatus>) => 
    set((state) => ({
      status: {
        ...state.status,
        ...updates,
        lastChecked: new Date(),
      },
    })),

  // Set online status
  setOnline: (isOnline: boolean) =>
    set((state) => ({
      status: {
        ...state.status,
        isOnline,
        // If going offline, Supabase is also disconnected
        isSupabaseConnected: isOnline ? state.status.isSupabaseConnected : false,
        lastChecked: new Date(),
      },
    })),

  // Set Supabase connection status
  setSupabaseConnected: (isConnected: boolean, latency?: number) =>
    set((state) => ({
      status: {
        ...state.status,
        isSupabaseConnected: isConnected,
        latency: latency ?? state.status.latency,
        lastChecked: new Date(),
      },
    })),

  // Check if fully connected
  isFullyConnected: () => {
    const state = get();
    return state.status.isOnline && state.status.isSupabaseConnected;
  },
}));
