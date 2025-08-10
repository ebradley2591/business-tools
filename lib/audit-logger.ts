import { adminDb } from './firebase-admin';

export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'IMPORT' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'INVITE' | 'ROLE_CHANGE';
  resource_type: 'CUSTOMER' | 'USER' | 'CUSTOM_FIELD' | 'TENANT' | 'SUBSCRIPTION' | 'INVITATION';
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  success: boolean;
  error_message?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private collection = 'auditLogs';

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date(),
      };

      await adminDb.collection(this.collection).add(logEntry);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging should not break the main application
    }
  }

  async logCustomerAction(
    tenant_id: string,
    user_id: string,
    user_email: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
    customer_id: string,
    customer_name: string,
    details?: Record<string, any>,
    ip_address?: string,
    user_agent?: string,
    success: boolean = true,
    error_message?: string
  ): Promise<void> {
    await this.log({
      tenant_id,
      user_id,
      user_email,
      action,
      resource_type: 'CUSTOMER',
      resource_id: customer_id,
      resource_name: customer_name,
      details,
      ip_address,
      user_agent,
      success,
      error_message,
    });
  }

  async logUserAction(
    tenant_id: string,
    user_id: string,
    user_email: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'INVITE' | 'ROLE_CHANGE',
    target_user_id?: string,
    target_user_email?: string,
    details?: Record<string, any>,
    ip_address?: string,
    user_agent?: string,
    success: boolean = true,
    error_message?: string
  ): Promise<void> {
    await this.log({
      tenant_id,
      user_id,
      user_email,
      action,
      resource_type: 'USER',
      resource_id: target_user_id,
      resource_name: target_user_email,
      details,
      ip_address,
      user_agent,
      success,
      error_message,
    });
  }

  async logImportAction(
    tenant_id: string,
    user_id: string,
    user_email: string,
    file_name: string,
    records_count: number,
    success_count: number,
    error_count: number,
    ip_address?: string,
    user_agent?: string,
    success: boolean = true,
    error_message?: string
  ): Promise<void> {
    await this.log({
      tenant_id,
      user_id,
      user_email,
      action: 'IMPORT',
      resource_type: 'CUSTOMER',
      resource_name: file_name,
      details: {
        records_count,
        success_count,
        error_count,
        file_name,
      },
      ip_address,
      user_agent,
      success,
      error_message,
    });
  }

  async logCustomFieldAction(
    tenant_id: string,
    user_id: string,
    user_email: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    field_id: string,
    field_name: string,
    details?: Record<string, any>,
    ip_address?: string,
    user_agent?: string,
    success: boolean = true,
    error_message?: string
  ): Promise<void> {
    await this.log({
      tenant_id,
      user_id,
      user_email,
      action,
      resource_type: 'CUSTOM_FIELD',
      resource_id: field_id,
      resource_name: field_name,
      details,
      ip_address,
      user_agent,
      success,
      error_message,
    });
  }

  async logAuthenticationAction(
    tenant_id: string,
    user_id: string,
    user_email: string,
    action: 'LOGIN' | 'LOGOUT',
    ip_address?: string,
    user_agent?: string,
    success: boolean = true,
    error_message?: string
  ): Promise<void> {
    await this.log({
      tenant_id,
      user_id,
      user_email,
      action,
      resource_type: 'USER',
      details: { authentication_method: 'email_password' },
      ip_address,
      user_agent,
      success,
      error_message,
    });
  }

  // Get audit logs for a tenant (admin only)
  async getAuditLogs(
    tenant_id: string,
    limit: number = 100,
    startAfter?: string
  ): Promise<AuditLogEntry[]> {
    try {
      let query = adminDb
        .collection(this.collection)
        .where('tenant_id', '==', tenant_id)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (startAfter) {
        const startDoc = await adminDb.collection(this.collection).doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as AuditLogEntry[];
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  // Get audit logs for a specific user
  async getUserAuditLogs(
    tenant_id: string,
    user_id: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      const snapshot = await adminDb
        .collection(this.collection)
        .where('tenant_id', '==', tenant_id)
        .where('user_id', '==', user_id)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as AuditLogEntry[];
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
