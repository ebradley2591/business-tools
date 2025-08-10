export interface Customer {
  id?: string;
  tenant_id: string; // Multi-tenant support
  name: string;
  phone: string;
  address: string;
  email?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  customerType?: string;
  accountNumber?: string;
  createdDate?: string;
  lastActivity?: string;
  tags: string[];
  customFields: { [key: string]: any };
  ownershipHistory: OwnershipRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnershipRecord {
  name: string;
  owner: string;
  timestamp: Date;
  notes?: string;
}

export interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  email?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  customerType?: string;
  accountNumber?: string;
  createdDate?: string;
  lastActivity?: string;
  tags: string[];
  customFields: { [key: string]: any };
}

export interface SearchFilters {
  searchTerm: string;
  tags: string[];
}

export interface CustomFieldDefinition {
  id: string;
  tenant_id: string; // Multi-tenant support
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean';
  required: boolean;
  options?: string[];
  defaultValue?: any;
  description?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
