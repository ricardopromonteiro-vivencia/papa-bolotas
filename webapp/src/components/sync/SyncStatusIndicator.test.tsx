/**
 * SyncStatusIndicator Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { syncService } from '@/services/sync.service';
import { SyncState } from '@/types';

// Mock sync service
vi.mock('@/services/sync.service', () => ({
  syncService: {
    getSyncState: vi.fn(),
    getIsSyncing: vi.fn(),
    getQueueStats: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  SyncEventType: {
    STATE_CHANGED: 'state_changed',
    SYNC_STARTED: 'sync_started',
    SYNC_COMPLETED: 'sync_completed',
    SYNC_FAILED: 'sync_failed'
  }
}));

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncService.getSyncState).mockReturnValue(SyncState.ONLINE);
    vi.mocked(syncService.getIsSyncing).mockReturnValue(false);
    vi.mocked(syncService.getQueueStats).mockResolvedValue({
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      total: 0
    });
  });

  it('renders sync status indicator', () => {
    render(<SyncStatusIndicator />);
    
    expect(screen.getByText(/Sincronizado/i)).toBeInTheDocument();
  });

  it('shows offline status when offline', () => {
    vi.mocked(syncService.getSyncState).mockReturnValue(SyncState.OFFLINE);
    
    render(<SyncStatusIndicator />);
    
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
  });

  it('shows syncing status when syncing', () => {
    vi.mocked(syncService.getIsSyncing).mockReturnValue(true);
    
    render(<SyncStatusIndicator />);
    
    expect(screen.getByText(/A sincronizar/i)).toBeInTheDocument();
  });

  it('hides text when showText is false', () => {
    render(<SyncStatusIndicator showText={false} />);
    
    expect(screen.queryByText(/Sincronizado/i)).not.toBeInTheDocument();
  });

  it('registers event listeners on mount', () => {
    render(<SyncStatusIndicator />);
    
    expect(syncService.addEventListener).toHaveBeenCalled();
  });

  it('unregisters event listeners on unmount', () => {
    const { unmount } = render(<SyncStatusIndicator />);
    
    unmount();
    
    expect(syncService.removeEventListener).toHaveBeenCalled();
  });
});
