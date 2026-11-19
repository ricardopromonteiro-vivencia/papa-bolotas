/**
 * Audit Log Service
 * 
 * Records system actions for security and compliance.
 * Logs user actions, system events, and data changes.
 */

import { db } from '@/lib/db';
import { AuditLog, AuditAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class AuditLogError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'AuditLogError';
  }
}

export class AuditLogService {
  async log(
    userId: string | undefined,
    action: AuditAction | string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: uuidv4(),
        userId,
        action,
        entityType,
        entityId,
        details,
        createdAt: new Date()
      };

      await db.auditLogs.add(auditLog);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  async getLogsByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return await db.auditLogs
      .where('userId')
      .equals(userId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db.auditLogs
      .where('[entityType+entityId]')
      .equals([entityType, entityId])
      .reverse()
      .toArray();
  }

  async getRecentLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db.auditLogs
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
