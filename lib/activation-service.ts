import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ActivationCode, ActivationCodeUsage } from '@/types/activation';
import { TenantService } from '@/lib/tenant-service';

export class ActivationService {
  /**
   * Generate a random activation code
   */
  static generateCode(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new activation code
   */
  static async createActivationCode(
    type: ActivationCode['type'],
    description?: string,
    maxUses?: number,
    expiresAt?: Date,
    createdBy?: string
  ): Promise<ActivationCode> {
    const code = this.generateCode();
    
    const activationCode: Omit<ActivationCode, 'id'> = {
      code,
      type,
      description,
      maxUses,
      currentUses: 0,
      isActive: true,
      createdAt: new Date(),
      expiresAt,
      createdBy,
      usedBy: []
    };

    const docRef = await adminDb.collection('activationCodes').add(activationCode);
    
    return {
      id: docRef.id,
      ...activationCode
    };
  }

  /**
   * Get activation code by code string
   */
  static async getActivationCode(code: string): Promise<ActivationCode | null> {
    try {
      const snapshot = await adminDb.collection('activationCodes')
        .where('code', '==', code)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();
      if (!data) return null;
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        expiresAt: data.expiresAt?.toDate()
      } as ActivationCode;
    } catch (error) {
      console.error('Error getting activation code:', error);
      return null;
    }
  }

  /**
   * Get activation code by ID
   */
  static async getActivationCodeById(id: string): Promise<ActivationCode | null> {
    try {
      const doc = await adminDb.collection('activationCodes').doc(id).get();
      
      if (!doc.exists) return null;

      const data = doc.data();
      if (!data) return null;
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        expiresAt: data.expiresAt?.toDate()
      } as ActivationCode;
    } catch (error) {
      console.error('Error getting activation code by ID:', error);
      return null;
    }
  }

  /**
   * Update an activation code
   */
  static async updateActivationCode(
    id: string, 
    updates: Partial<Omit<ActivationCode, 'id' | 'code' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = adminDb.collection('activationCodes').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return { success: false, error: 'Activation code not found' };
      }

      // Remove fields that shouldn't be updated
      const { ...safeUpdates } = updates;
      
      await docRef.update({
        ...safeUpdates,
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating activation code:', error);
      return { success: false, error: 'Failed to update activation code' };
    }
  }

  /**
   * Delete an activation code
   */
  static async deleteActivationCode(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = adminDb.collection('activationCodes').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return { success: false, error: 'Activation code not found' };
      }

      await docRef.delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting activation code:', error);
      return { success: false, error: 'Failed to delete activation code' };
    }
  }

  /**
   * Validate and use an activation code
   */
  static async validateAndUseCode(
    code: string,
    userId: string,
    tenantId: string,
    userEmail: string,
    tenantName: string
  ): Promise<{ success: boolean; error?: string; plan?: string }> {
    try {
      console.log(`Looking for activation code: ${code}`);
      const activationCode = await this.getActivationCode(code);
      
      if (!activationCode) {
        console.log('Activation code not found in database');
        return { success: false, error: 'Invalid activation code' };
      }

      console.log('Found activation code:', {
        id: activationCode.id,
        type: activationCode.type,
        isActive: activationCode.isActive,
        currentUses: activationCode.currentUses,
        maxUses: activationCode.maxUses
      });

      if (!activationCode.isActive) {
        return { success: false, error: 'Activation code is inactive' };
      }

      if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
        return { success: false, error: 'Activation code has expired' };
      }

      if (activationCode.maxUses && activationCode.currentUses >= activationCode.maxUses) {
        return { success: false, error: 'Activation code usage limit reached' };
      }

      if (activationCode.usedBy?.includes(userId)) {
        return { success: false, error: 'You have already used this activation code' };
      }

      // Determine plan based on activation code type
      let plan: string;
      switch (activationCode.type) {
        case 'dev':
          plan = 'enterprise';
          break;
        case 'early_adopter':
          plan = 'pro';
          break;
        case 'contributor':
          plan = 'enterprise';
          break;
        default:
          plan = 'free';
      }

      // Update activation code usage
      const batch = adminDb.batch();
      
      const codeRef = adminDb.collection('activationCodes').doc(activationCode.id);
      batch.update(codeRef, {
        currentUses: activationCode.currentUses + 1,
        usedBy: FieldValue.arrayUnion(userId)
      });

      // Create usage record
      const usageRef = adminDb.collection('activationCodeUsage').doc();
      const usage: Omit<ActivationCodeUsage, 'id'> = {
        activationCodeId: activationCode.id,
        userId,
        tenantId,
        usedAt: new Date(),
        userEmail,
        tenantName
      };
      batch.set(usageRef, usage);

      // Update tenant subscription to permanent access
      console.log(`🎯 Updating tenant subscription to permanent access`);
      await TenantService.updateTenantSubscription(tenantId, 'active', plan as any);
      
      // Update tenant with permanent access flag (separate from subscription update)
      console.log(`🎯 Adding permanent access flag to tenant`);
      const tenantRef = adminDb.collection('tenants').doc(tenantId);
      batch.update(tenantRef, {
        isPermanentAccess: true,
        activationCodeType: activationCode.type,
        updatedAt: new Date()
      });

      console.log(`💾 Committing activation code updates...`);
      await batch.commit();
      console.log(`✅ Activation code validation complete`);

      return { success: true, plan };
    } catch (error) {
      console.error('Error validating activation code:', error);
      return { success: false, error: 'Failed to validate activation code' };
    }
  }

  /**
   * Get all activation codes (admin only)
   */
  static async getAllActivationCodes(): Promise<ActivationCode[]> {
    try {
      const snapshot = await adminDb.collection('activationCodes')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        } as ActivationCode;
      });
    } catch (error) {
      console.error('Error getting activation codes:', error);
      return [];
    }
  }

  /**
   * Get activation code usage statistics
   */
  static async getActivationCodeUsage(codeId: string): Promise<ActivationCodeUsage[]> {
    try {
      const snapshot = await adminDb.collection('activationCodeUsage')
        .where('activationCodeId', '==', codeId)
        .orderBy('usedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          usedAt: data.usedAt?.toDate()
        } as ActivationCodeUsage;
      });
    } catch (error) {
      console.error('Error getting activation code usage:', error);
      return [];
    }
  }

  /**
   * Deactivate an activation code
   */
  static async deactivateCode(codeId: string): Promise<boolean> {
    try {
      await adminDb.collection('activationCodes').doc(codeId).update({
        isActive: false,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error deactivating activation code:', error);
      return false;
    }
  }

  /**
   * Create default activation codes for development
   */
  static async createDefaultCodes(): Promise<void> {
    try {
      // Check if default codes already exist
      const existingCodes = await this.getAllActivationCodes();
      const hasDevCode = existingCodes.some(code => code.type === 'dev');
      const hasEarlyAdopterCode = existingCodes.some(code => code.type === 'early_adopter');

      if (!hasDevCode) {
        await this.createActivationCode(
          'dev',
          'Development access - unlimited enterprise features',
          undefined, // unlimited uses
          undefined, // no expiration
          'system'
        );
      }

      if (!hasEarlyAdopterCode) {
        await this.createActivationCode(
          'early_adopter',
          'Early adopter access - pro features for contributors',
          100, // max 100 uses
          undefined, // no expiration
          'system'
        );
      }

      console.log('Default activation codes created successfully');
    } catch (error) {
      console.error('Error creating default activation codes:', error);
    }
  }
}
