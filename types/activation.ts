export interface ActivationCode {
  id: string;
  code: string;
  type: 'dev' | 'early_adopter' | 'contributor';
  description?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date; // Optional expiration for some codes
  createdBy?: string; // Who created this code
  usedBy?: string[]; // Array of user IDs who used this code
}

export interface ActivationCodeUsage {
  id: string;
  activationCodeId: string;
  userId: string;
  tenantId: string;
  usedAt: Date;
  userEmail: string;
  tenantName: string;
}

export interface ActivationCodeRequest {
  code: string;
  tenantName: string;
}
