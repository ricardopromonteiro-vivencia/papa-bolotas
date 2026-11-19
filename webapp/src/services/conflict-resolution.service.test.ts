/**
 * Conflict Resolution Service Tests
 * 
 * Tests conflict resolution strategies and audit logging.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ConflictResolutionService, 
  ConflictResolutionStrategy, 
  ConflictResolutionError 
} from './conflict-resolution.service';
import { db } from '@/lib/db';

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-conflict-uuid-' + Math.random().toString(36).substr(2, 9)
}));

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;

  beforeEach(async () => {
    service = new ConflictResolutionService();
    await db.auditLogs.clear();
  });

  afterEach(async () => {
    await db.auditLogs.clear();
  });

  describe('resolveConflict', () => {
    it('should resolve with local version when LOCAL_WINS strategy', async () => {
      const local = { id: '1', name: 'Local', version: 1 };
      const remote = { id: '1', name: 'Remote', version: 2 };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.LOCAL_WINS
      );

      expect(resolved).toEqual(local);
    });

    it('should resolve with remote version when REMOTE_WINS strategy', async () => {
      const local = { id: '1', name: 'Local', version: 2 };
      const remote = { id: '1', name: 'Remote', version: 1 };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.REMOTE_WINS
      );

      expect(resolved).toEqual(remote);
    });

    it('should resolve with higher version when LAST_WRITE_WINS strategy', async () => {
      const local = { id: '1', name: 'Local', version: 1 };
      const remote = { id: '1', name: 'Remote', version: 2 };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(resolved).toEqual(remote);
    });

    it('should resolve with local when local version is higher', async () => {
      const local = { id: '1', name: 'Local', version: 3 };
      const remote = { id: '1', name: 'Remote', version: 2 };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(resolved).toEqual(local);
    });

    it('should resolve by updatedAt when no version field', async () => {
      const local = { 
        id: '1', 
        name: 'Local', 
        updatedAt: new Date('2024-01-15T10:00:00')
      };
      const remote = { 
        id: '1', 
        name: 'Remote', 
        updatedAt: new Date('2024-01-15T11:00:00')
      };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(resolved).toEqual(remote);
    });

    it('should resolve by createdAt when no version or updatedAt', async () => {
      const local = { 
        id: '1', 
        name: 'Local', 
        createdAt: new Date('2024-01-15T10:00:00')
      };
      const remote = { 
        id: '1', 
        name: 'Remote', 
        createdAt: new Date('2024-01-15T09:00:00')
      };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(resolved).toEqual(local);
    });

    it('should default to remote when no comparison possible', async () => {
      const local = { id: '1', name: 'Local' };
      const remote = { id: '1', name: 'Remote' };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(resolved).toEqual(remote);
    });

    it('should return null for MANUAL strategy', async () => {
      const local = { id: '1', name: 'Local', version: 1 };
      const remote = { id: '1', name: 'Remote', version: 2 };

      const resolved = await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.MANUAL
      );

      expect(resolved).toBeNull();
    });

    it('should log conflict to audit trail', async () => {
      const local = { id: '1', name: 'Local', version: 1 };
      const remote = { id: '1', name: 'Remote', version: 2 };

      await service.resolveConflict(
        'menuItem',
        '1',
        local,
        remote,
        ConflictResolutionStrategy.REMOTE_WINS
      );

      const logs = await db.auditLogs.toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].entityType).toBe('menuItem');
      expect(logs[0].entityId).toBe('1');
      expect(logs[0].changes).toMatchObject({
        type: 'conflict_resolution',
        resolution: 'remote'
      });
    });
  });

  describe('hasConflict', () => {
    it('should return true when versions differ', () => {
      expect(service.hasConflict(1, 2)).toBe(true);
    });

    it('should return false when versions match', () => {
      expect(service.hasConflict(2, 2)).toBe(false);
    });
  });

  describe('versionsMatch', () => {
    it('should return false when versions differ', () => {
      const local = { version: 1 };
      const remote = { version: 2 };

      expect(service.versionsMatch(local, remote)).toBe(false);
    });

    it('should return true when versions match', () => {
      const local = { version: 2 };
      const remote = { version: 2 };

      expect(service.versionsMatch(local, remote)).toBe(true);
    });

    it('should return true when no version field', () => {
      const local = { id: '1', name: 'Test' };
      const remote = { id: '1', name: 'Test' };

      expect(service.versionsMatch(local, remote)).toBe(true);
    });
  });

  describe('getConflictHistory', () => {
    it('should return conflict resolution history for entity', async () => {
      const local = { id: '1', name: 'Local', version: 1 };
      const remote = { id: '1', name: 'Remote', version: 2 };

      await service.resolveConflict('menuItem', '1', local, remote);
      await service.resolveConflict('menuItem', '1', local, remote);

      const history = await service.getConflictHistory('menuItem', '1');

      expect(history).toHaveLength(2);
      expect(history.every(log => log.entityId === '1')).toBe(true);
    });

    it('should return empty array when no conflicts', async () => {
      const history = await service.getConflictHistory('menuItem', '999');

      expect(history).toHaveLength(0);
    });

    it('should filter out non-conflict entries', async () => {
      // Add non-conflict audit log
      await db.auditLogs.add({
        id: 'log-1',
        userId: 'user-1',
        action: 'create_order',
        entityType: 'order',
        entityId: '1',
        changes: { total: 10.00 },
        createdAt: new Date()
      });

      const history = await service.getConflictHistory('order', '1');

      expect(history).toHaveLength(0);
    });
  });

  describe('getRecommendedStrategy', () => {
    it('should recommend LAST_WRITE_WINS when version available', () => {
      const local = { version: 1 };
      const remote = { version: 2 };

      const strategy = service.getRecommendedStrategy(local, remote);

      expect(strategy).toBe(ConflictResolutionStrategy.LAST_WRITE_WINS);
    });

    it('should recommend LAST_WRITE_WINS when updatedAt available', () => {
      const local = { updatedAt: new Date() };
      const remote = { updatedAt: new Date() };

      const strategy = service.getRecommendedStrategy(local, remote);

      expect(strategy).toBe(ConflictResolutionStrategy.LAST_WRITE_WINS);
    });

    it('should recommend REMOTE_WINS when no version info', () => {
      const local = { id: '1', name: 'Local' };
      const remote = { id: '1', name: 'Remote' };

      const strategy = service.getRecommendedStrategy(local, remote);

      expect(strategy).toBe(ConflictResolutionStrategy.REMOTE_WINS);
    });
  });

  describe('notifyConflictResolved', () => {
    it('should not throw error when notifying', () => {
      const conflict = {
        entityType: 'menuItem',
        entityId: '1',
        localVersion: { version: 1 },
        remoteVersion: { version: 2 },
        resolution: 'remote' as const
      };

      expect(() => {
        service.notifyConflictResolved(conflict);
      }).not.toThrow();
    });
  });
});
