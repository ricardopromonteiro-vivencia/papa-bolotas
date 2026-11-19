/**
 * SyncStatusIndicator Component
 * 
 * Displays current synchronization status with visual indicators.
 * Shows online/offline state, sync progress, and queue statistics.
 */

import { useEffect, useState } from 'react';
import { syncService, SyncEventType } from '@/services/sync.service';
import { SyncState } from '@/types';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  /** Show detailed status text */
  showText?: boolean;
  /** Component size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * Sync Status Indicator Component
 * 
 * Visual indicator for synchronization state and progress.
 */
export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  showText = true,
  size = 'md',
  className
}) => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getSyncState());
  const [isSyncing, setIsSyncing] = useState(syncService.getIsSyncing());
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0, total: 0 });

  useEffect(() => {
    // Update queue stats periodically
    const updateStats = async () => {
      const stats = await syncService.getQueueStats();
      setQueueStats(stats);
    };

    updateStats();
    const statsInterval = setInterval(updateStats, 5000); // Update every 5 seconds

    // Listen to sync state changes
    const handleStateChange = (event: any) => {
      setSyncState(event.data.state);
    };

    const handleSyncStarted = () => {
      setIsSyncing(true);
    };

    const handleSyncCompleted = () => {
      setIsSyncing(false);
      updateStats();
    };

    const handleSyncFailed = () => {
      setIsSyncing(false);
      updateStats();
    };

    syncService.addEventListener(SyncEventType.STATE_CHANGED, handleStateChange);
    syncService.addEventListener(SyncEventType.SYNC_STARTED, handleSyncStarted);
    syncService.addEventListener(SyncEventType.SYNC_COMPLETED, handleSyncCompleted);
    syncService.addEventListener(SyncEventType.SYNC_FAILED, handleSyncFailed);

    return () => {
      clearInterval(statsInterval);
      syncService.removeEventListener(SyncEventType.STATE_CHANGED, handleStateChange);
      syncService.removeEventListener(SyncEventType.SYNC_STARTED, handleSyncStarted);
      syncService.removeEventListener(SyncEventType.SYNC_COMPLETED, handleSyncCompleted);
      syncService.removeEventListener(SyncEventType.SYNC_FAILED, handleSyncFailed);
    };
  }, []);

  /**
   * Get icon based on sync state
   */
  const getIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';

    if (isSyncing) {
      return <RefreshCw className={cn(iconSize, 'animate-spin')} />;
    }

    switch (syncState) {
      case SyncState.ONLINE:
        return queueStats.failed > 0 
          ? <AlertCircle className={iconSize} />
          : queueStats.pending > 0 
            ? <Cloud className={iconSize} />
            : <CheckCircle className={iconSize} />;
      case SyncState.OFFLINE:
        return <CloudOff className={iconSize} />;
      case SyncState.ERROR:
        return <AlertCircle className={iconSize} />;
      default:
        return <Cloud className={iconSize} />;
    }
  };

  /**
   * Get color based on sync state
   */
  const getColor = () => {
    if (isSyncing) {
      return 'text-blue-600';
    }

    switch (syncState) {
      case SyncState.ONLINE:
        return queueStats.failed > 0 
          ? 'text-orange-600'
          : queueStats.pending > 0 
            ? 'text-blue-600'
            : 'text-green-600';
      case SyncState.OFFLINE:
        return 'text-gray-400';
      case SyncState.ERROR:
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    if (isSyncing) {
      return 'A sincronizar...';
    }

    switch (syncState) {
      case SyncState.ONLINE:
        if (queueStats.failed > 0) {
          return `${queueStats.failed} falha${queueStats.failed > 1 ? 's' : ''}`;
        }
        if (queueStats.pending > 0) {
          return `${queueStats.pending} pendente${queueStats.pending > 1 ? 's' : ''}`;
        }
        return 'Sincronizado';
      case SyncState.OFFLINE:
        return 'Offline';
      case SyncState.ERROR:
        return 'Erro de sincronização';
      default:
        return 'Desconhecido';
    }
  };

  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center justify-center', getColor())}>
        {getIcon()}
      </div>
      
      {showText && (
        <span className={cn(textSize, 'font-medium', getColor())}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
