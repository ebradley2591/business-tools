import { z } from 'zod';

// Customer data validation schemas
export const CustomerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-'\.]+$/, 'Name contains invalid characters'),
  
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[\+]?[0-9\s\-\(\)\.]+$/, 'Phone number contains invalid characters'),
  
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-'\.\,\#]+$/, 'Address contains invalid characters'),
  
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  secondaryContactName: z.string()
    .max(100, 'Secondary contact name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-'\.]*$/, 'Secondary contact name contains invalid characters')
    .optional()
    .or(z.literal('')),
  
  secondaryContactPhone: z.string()
    .max(20, 'Secondary phone must be less than 20 characters')
    .regex(/^[\+]?[0-9\s\-\(\)\.]*$/, 'Secondary phone contains invalid characters')
    .optional()
    .or(z.literal('')),
  
  customerType: z.string()
    .max(50, 'Customer type must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Customer type contains invalid characters')
    .optional()
    .or(z.literal('')),
  
  accountNumber: z.string()
    .max(50, 'Account number must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Account number contains invalid characters')
    .optional()
    .or(z.literal('')),
  
  createdDate: z.string()
    .optional()
    .or(z.literal('')),
  
  lastActivity: z.string()
    .optional()
    .or(z.literal('')),
  
  tags: z.array(z.string())
    .max(20, 'Maximum 20 tags allowed')
    .refine(tags => tags.every(tag => 
      tag.length >= 1 && tag.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(tag)
    ), 'Tags contain invalid characters or are too long'),
  
  customFields: z.record(z.string(), z.any()).optional(),
  
  ownershipHistory: z.array(z.object({
    name: z.string()
      .min(1, 'Owner name is required')
      .max(100, 'Owner name must be less than 100 characters')
      .regex(/^[a-zA-Z0-9\s\-'\.]+$/, 'Owner name contains invalid characters'),
    timestamp: z.date(),
    current: z.boolean().optional(),
    notes: z.string()
      .max(500, 'Notes must be less than 500 characters')
      .optional()
      .or(z.literal(''))
  })).optional()
});

// Custom field validation schema
export const CustomFieldSchema = z.object({
  name: z.string()
    .min(1, 'Field name is required')
    .max(50, 'Field name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Field name contains invalid characters'),
  
  type: z.enum(['text', 'number', 'date', 'select', 'textarea', 'boolean']),
  
  required: z.boolean().optional(),
  
  options: z.array(z.string())
    .max(20, 'Maximum 20 options allowed')
    .refine(options => options.every(option => 
      option.length >= 1 && option.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(option)
    ), 'Options contain invalid characters or are too long')
    .optional(),
  
  defaultValue: z.any().optional(),
  
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional()
    .or(z.literal(''))
});

// User invitation validation schema
export const UserInviteSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters'),
  
  role: z.enum(['admin', 'user'])
});

// CSV import validation
export const CSVValidationSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(file => file.type === 'text/csv', 'File must be a CSV'),
  
  maxRows: z.number()
    .min(1, 'At least 1 row required')
    .max(10000, 'Maximum 10,000 rows allowed')
});

// Sanitization functions
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>]/g, '')
    .substring(0, 100);
}

export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  return phone
    .trim()
    .replace(/[^0-9\s\-\(\)\+\.]/g, '') // Keep only valid phone characters
    .substring(0, 20);
}

export function sanitizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  
  return tags
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 50)
    .filter(tag => /^[a-zA-Z0-9\s\-_]+$/.test(tag))
    .slice(0, 20); // Limit to 20 tags
}

// Validation helper functions
export function validateCustomerData(data: any) {
  try {
    return CustomerSchema.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
    throw new Error('Validation failed');
  }
}

// Function to validate CSV data with more lenient rules for imports
export function validateCSVData(data: any) {
  try {
    // Create a more lenient schema for CSV imports
    const result = { isValid: true, errors: [] as string[] };
    
    // Log full data object for debugging
    console.log('Validating data object:', JSON.stringify(data));
    
    // Check required fields
    if (!data.name) {
      result.isValid = false;
      result.errors.push('Name is required');
      console.log('Name validation failed - Value:', data.name);
    }
    
    if (!data.phone) {
      console.log('Phone validation - Missing phone, providing default');
      data.phone = 'No phone provided';
    } else {
      // Make phone more lenient by removing all non-numeric characters for validation
      const cleanedPhone = data.phone.replace(/\D/g, '');
      console.log('Phone validation - Original:', data.phone, 'Cleaned:', cleanedPhone, 'Length:', cleanedPhone.length);
      
      // Accept any phone number, no minimum length requirement
      if (cleanedPhone.length === 0) {
        console.log('Phone validation - No numeric digits in phone, providing default');
        data.phone = 'No valid phone provided';
      }
    }
    
    // Check email format if provided and not empty
    if (data.email && data.email.trim() !== '') {
      console.log('Email validation - Value:', data.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        console.log('Email validation - Invalid format, providing sanitized version');
        // Don't fail validation, just sanitize the email
        data.email = 'invalid@example.com';
      }
    }
    
    // Make address optional - don't fail validation if missing
    if (!data.address || data.address.trim() === '') {
      console.log('Address missing - providing default value');
      data.address = 'No address provided';
    }
    
    // Log validation result
    console.log('CSV validation result for', data.name || 'unnamed record', ':', 
      result.isValid ? 'PASSED' : 'FAILED', result.errors);
    
    return result;
  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      errors: ['Validation failed: Unknown error']
    };
  }
}

export function validateCustomField(data: any) {
  try {
    return CustomFieldSchema.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
    throw new Error('Validation failed');
  }
}

export function validateUserInvite(data: any) {
  try {
    return UserInviteSchema.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
    throw new Error('Validation failed');
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const record = this.requests.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - record.count);
  }
}
