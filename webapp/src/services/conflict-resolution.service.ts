/**
 * Conflict Resolution Service
 * 
 * Handles conflicts when local and remote data diverge.
 * Implements last-write-wins strategy with version tracking.
 * 
 * Requirements:
 * - 3.7: Log conflicts to audit trail
 * - 14.7: Implement conflict resolution strategy
 */

import { db } from '@/lib/db';
import { Conflict, AuditAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  /** Use local version (client wins) */
  LOCAL_WINS = 'local',
  /** Use remote version (server wins) */
  REMOTE_WINS = 'remote',
  /** Last write wins based on timestamp */
  LAST_WRITE_WINS = 'last_write_wins',
  /** Manual resolution required */
  MANUAL = 'manual'
}

/**
 * Custom error class for conflict resolution failures
 */
export class ConflictResolutionError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}

/**
 * Conflict Resolution Service
 * 
 * Resolves data conflicts using last-write-wins strategy and version tracking.
 */
export class ConflictResolutionService {
  private readonly defaultStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS;

  /**
   * Resolve conflict between local and remote versions
   * 
   * Requirement 14.7: Conflict resolution strategy
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param localVersion - Local version of data
   * @param remoteVersion - Remote version of data
   * @param strategy - Resolution strategy (default: last-write-wins)
   * @returns Resolved version
   */
  async resolveConflict(
    entityType: string,
    entityId: string,
    localVersion: any,
    remoteVersion: any,
    strategy: ConflictResolutionStrategy = this.defaultStrategy
  ): Promise<any> {
    try {
      // Create conflict record
      const conflict: Conflict = {
        entityType,
        entityId,
        localVersion,
        remoteVersion,
        resolution: undefined
      };

      // Resolve based on strategy
      let resolvedVersion: any;
      let resolutionType: 'local' | 'remote' | 'manual';

      switch (strategy) {
        case ConflictResolutionStrategy.LOCAL_WINS:
          resolvedVersion = localVersion;
          resolutionType = 'local';
          break;

        case ConflictResolutionStrategy.REMOTE_WINS:
          resolvedVersion = remoteVersion;
          resolutionType = 'remote';
          break;

        case ConflictResolutionStrategy.LAST_WRITE_WINS:
          resolvedVersion = this.resolveByLastWrite(localVersion, remoteVersion);
          resolutionType = resolvedVersion === localVersion ? 'local' : 'remote';
          break;

        case ConflictResolutionStrategy.MANUAL:
          resolutionType = 'manual';
          resolvedVersion = null;
          break;

        default:
          throw new ConflictResolutionError(
            `Estratégia de resolução desconhecida: ${strategy}`,
            'UNKNOWN_STRATEGY'
          );
      }

      conflict.resolution = resolutionType;

      // Log conflict to audit trail (Requirement 3.7)
      await this.logConflict(conflict, resolvedVersion);

      if (import.meta.env.DEV) {
        console.log(
          `Conflict resolved (${resolutionType}): ${entityType}/${entityId}`,
          { local: localVersion, remote: remoteVersion, resolved: resolvedVersion }
        );
      }

      return resolvedVersion;
    } catch (error) {
      throw new ConflictResolutionError(
        `Falha ao resolver o conflito: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'RESOLUTION_FAILED'
      );
    }
  }

  /**
   * Resolve conflict using last-write-wins strategy
   * 
   * Compares version numbers or timestamps.
   * 
   * @param localVersion - Local version
   * @param remoteVersion - Remote version
   * @returns Version that was written last
   */
  private resolveByLastWrite(localVersion: any, remoteVersion: any): any {
    // Compare by version number if available
    if (localVersion.version !== undefined && remoteVersion.version !== undefined) {
      return localVersion.version > remoteVersion.version ? localVersion : remoteVersion;
    }

    // Compare by updatedAt timestamp if available
    if (localVersion.updatedAt && remoteVersion.updatedAt) {
      const localDate = new Date(localVersion.updatedAt);
      const remoteDate = new Date(remoteVersion.updatedAt);
      return localDate > remoteDate ? localVersion : remoteVersion;
    }

    // Compare by createdAt timestamp if available
    if (localVersion.createdAt && remoteVersion.createdAt) {
      const localDate = new Date(localVersion.createdAt);
      const remoteDate = new Date(remoteVersion.createdAt);
      return localDate > remoteDate ? localVersion : remoteVersion;
    }

    // Default to remote version if no comparison possible
    if (import.meta.env.DEV) {
      console.warn('Cannot determine last write, defaulting to remote version');
    }
    return remoteVersion;
  }

  /**
   * Log conflict to audit trail
   * 
   * Requirement 3.7: Log conflicts to audit trail
   * 
   * @param conflict - Conflict details
   * @param resolvedVersion - Resolved version
   */
  private async logConflict(conflict: Conflict, resolvedVersion: any): Promise<void> {
    try {
      const auditLog = {
        id: uuidv4(),
        userId: undefined, // System action
        action: AuditAction.UPDATE_MENU_ITEM, // Use generic update action
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        details: {
          type: 'conflict_resolution',
          resolution: conflict.resolution,
          localVersion: conflict.localVersion,
          remoteVersion: conflict.remoteVersion,
          resolvedVersion: resolvedVersion
        },
        createdAt: new Date()
      };

      await db.auditLogs.add(auditLog);
    } catch (error) {
      // Log error but don't fail conflict resolution
      console.error('Failed to log conflict to audit trail:', error);
    }
  }

  /**
   * Check if entity has conflict
   * 
   * Compares version numbers between local and remote.
   * 
   * @param localVersion - Local version number
   * @param remoteVersion - Remote version number
   * @returns true if versions conflict
   */
  hasConflict(localVersion: number, remoteVersion: number): boolean {
    return localVersion !== remoteVersion;
  }

  /**
   * Check if entity versions match
   * 
   * @param localData - Local entity data
   * @param remoteData - Remote entity data
   * @returns true if versions match
   */
  versionsMatch(localData: any, remoteData: any): boolean {
    if (localData.version !== undefined && remoteData.version !== undefined) {
      return localData.version === remoteData.version;
    }

    // If no version field, consider them matching (no conflict)
    return true;
  }

  /**
   * Get conflict history for entity
   * 
   * Returns audit log entries for conflict resolutions.
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @returns Array of conflict resolutions
   */
  async getConflictHistory(entityType: string, entityId: string): Promise<any[]> {
    try {
      const logs = await db.auditLogs
        .where('[entityType+entityId]')
        .equals([entityType, entityId])
        .toArray();

      // Filter for conflict resolution entries
      return logs.filter(log => 
        log.details && 
        typeof log.details === 'object' && 
        'type' in log.details &&
        log.details.type === 'conflict_resolution'
      );
    } catch (error) {
      throw new ConflictResolutionError(
        `Falha ao obter o histórico de conflitos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'GET_HISTORY_ERROR'
      );
    }
  }

  /**
   * Notify user of conflict resolution
   * 
   * Can be extended to show UI notifications.
   * 
   * @param conflict - Resolved conflict
   */
  notifyConflictResolved(conflict: Conflict): void {
    if (import.meta.env.DEV) {
      console.log('Conflict resolved:', conflict);
    }

    // TODO: Implement UI notification when notification system is available
    // For now, just log to console
  }

  /**
   * Get recommended resolution strategy
   * 
   * Analyzes conflict and recommends strategy.
   * 
   * @param localVersion - Local version
   * @param remoteVersion - Remote version
   * @returns Recommended strategy
   */
  getRecommendedStrategy(
    localVersion: any,
    _remoteVersion: any
  ): ConflictResolutionStrategy {
    // If versions available, use last-write-wins
    if (localVersion.version !== undefined || localVersion.updatedAt !== undefined) {
      return ConflictResolutionStrategy.LAST_WRITE_WINS;
    }

    // If no version info, default to remote wins (server authority)
    return ConflictResolutionStrategy.REMOTE_WINS;
  }
}

/**
 * Global conflict resolution service instance
 */
export const conflictResolutionService = new ConflictResolutionService();

export default conflictResolutionService;
