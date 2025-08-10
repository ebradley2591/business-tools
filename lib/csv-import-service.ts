import { sanitizeString, sanitizeEmail, sanitizePhone, sanitizeTags } from '@/lib/validation';

// CSV Format Definitions
export const CSV_FORMATS: Record<string, {
  name: string;
  fieldMappings: Record<string, string>;
  skipFields: string[];
}> = {
  SAGE_50: {
    name: 'Sage 50',
    fieldMappings: {
      'Customer Name': 'name',
      'Telephone 1': 'phone',
      'Telephone 2': 'secondaryContactPhone',
      'Customer E-mail': 'email',
      'Bill to Address-Line One': 'address1',
      'Bill to Address-Line Two': 'address2',
      'Bill to City': 'city',
      'Bill to State': 'state',
      'Bill to Zip': 'zip',
      'Second Contact': 'secondaryContactName',
      'Account #': 'accountNumber',
      'Customer Type': 'customerType',
      'Reference': 'notes',
      'Customer Since Date': 'createdDate',
      'Last Statement Date': 'lastActivity',
      'Owner': 'ownershipHistory',
      'Current Owner': 'ownershipHistory',
      'Property Owner': 'ownershipHistory',
    },
    skipFields: [
      'Customer ID', 'Prospect', 'Inactive', 'Bill to Contact First Name',
      'Bill to Contact Last Name', 'Bill to Country', 'Bill to Sales Tax ID',
      'Ship to Address 1-Line One', 'Ship to Address 1-Line Two', 'Ship to City 1',
      'Ship to State 1', 'Ship to Zipcode 1', 'Ship to Country 1', 'Ship to Sales Tax ID 1',
      'Fax Number', 'Sales Representative ID', 'G/L Sales Account', 'Open Purchase Order Number',
      'Ship Via', 'Resale Number', 'Pricing Level', 'Use Standard Terms', 'C.O.D. Terms',
      'Prepaid Terms', 'Terms Type', 'Due Days', 'Discount Days', 'Discount Percent',
      'Credit Status', 'Charge Finance Charges', 'Due Month End Terms', 'Cardholder\'s Name',
      'Credit Card Address Line 1', 'Credit Card Address Line 2', 'Credit Card City',
      'Credit Card State', 'Credit Card Zip Code', 'Credit Card Country',
      'Credit Card Stored Reference', 'Merchant ID', 'Last Known CC Number',
      'Last Known CC Expiration Date', 'ACH Stored Reference', 'Last Known ACH Number',
      'Use Receipt Settings', 'Customer Payment Method', 'Customer Cash Account',
      'Mailing List?', 'Multiple Sites?', 'EIN #', 'Customer Web Site', 'ID Replacement'
    ]
  },
  QUICKBOOKS: {
    name: 'QuickBooks',
    fieldMappings: {
      'Customer': 'name',
      'Phone': 'phone',
      'Email': 'email',
      'Address': 'address1',
      'City': 'city',
      'State': 'state',
      'Zip': 'zip',
      'Contact': 'secondaryContactName',
      'Account Number': 'accountNumber',
      'Customer Type': 'customerType',
      'Notes': 'notes',
      'Owner': 'ownershipHistory',
      'Current Owner': 'ownershipHistory',
      'Property Owner': 'ownershipHistory',
    },
    skipFields: [
      'Customer ID', 'Balance', 'Terms', 'Tax Code', 'Tax Item',
      'Ship To', 'Bill To', 'Credit Limit', 'Job Status'
    ]
  },
  GENERIC: {
    name: 'Generic CSV',
    fieldMappings: {
      'Name': 'name',
      'Customer Name': 'name',
      'Company Name': 'name',
      'Business Name': 'name',
      'Phone': 'phone',
      'Phone Number': 'phone',
      'Telephone': 'phone',
      'Mobile': 'phone',
      'Billing Address 1': 'address1',
      'Billing Address 2': 'address2',
      'Address': 'address1',
      'Street Address': 'address1',
      'Street': 'address1',
      'Billing City': 'city',
      'City': 'city',
      'Billing State': 'state',
      'State': 'state',
      'Province': 'state',
      'Billing Postal Code': 'zip',
      'Zip': 'zip',
      'Postal Code': 'zip',
      'ZIP Code': 'zip',
      'Email Address': 'email',
      'Email': 'email',
      'E-mail': 'email',
      'Secondary Contact Name': 'secondaryContactName',
      'Contact': 'secondaryContactName',
      'Contact Person': 'secondaryContactName',
      'Secondary Contact': 'secondaryContactName',
      'Secondary Contact Phone': 'secondaryContactPhone',
      'Customer Type': 'customerType',
      'Notes': 'notes',
      'Comments': 'notes',
      'Description': 'notes',
      'Tags': 'tags',
      'Owner': 'ownershipHistory',
      'Current Owner': 'ownershipHistory',
      'Property Owner': 'ownershipHistory',
    },
    skipFields: []
  }
};

// Standard field display names - only fields that exist in manual entry form
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  name: 'Customer Name',
  phone: 'Phone Number',
  email: 'Email Address',
  address: 'Address',
  secondaryContactName: 'Secondary Contact Name',
  secondaryContactPhone: 'Secondary Contact Phone',
  notes: 'Notes',
  tags: 'Tags',
  ownershipHistory: 'Owner/Property Owner',
  customerType: 'Customer Type',
  accountNumber: 'Account Number',
  createdDate: 'Customer Since Date',
  lastActivity: 'Last Activity Date',
};

// Types for CSV Import
export interface CSVAnalysis {
  headers: string[];
  totalRows: number;
  sampleData: Record<string, string[]>;
  fieldMapping: Record<string, string>;
  customFieldsToCreate: Array<{
    name: string;
    type: string;
    values: string[];
  }>;
  skippedFields: string[];
  validationIssues: string[];
  detectedFormat: string;
  estimatedRecords: number;
}

export interface ImportPreview {
  detectedFormat: string;
  fieldMappings: Record<string, string>;
  sampleData: any[];
  estimatedRecords: number;
  warnings: string[];
  customFieldsToCreate: Array<{
    name: string;
    type: string;
    values: string[];
  }>;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
    data: any;
  }>;
  warnings: string[];
  customFieldsCreated: number;
  total: number;
}

export interface CustomMapping {
  csvField: string;
  targetField: string;
  customFieldName?: string;
  skip?: boolean;
}

// Helper function to determine field type based on content
export function inferFieldType(values: string[]): 'text' | 'number' | 'date' | 'boolean' | 'select' {
  const nonEmptyValues = values.filter(v => v && v.trim() !== '');
  if (nonEmptyValues.length === 0) return 'text';
  
  // Check if it's a boolean field
  const booleanValues = ['yes', 'no', 'true', 'false', 'active', 'inactive', '1', '0', 'y', 'n'];
  if (nonEmptyValues.every(v => booleanValues.includes(v.toLowerCase()))) {
    return 'boolean';
  }
  
  // Check if it's a date field
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{2}$/, // MM/DD/YY
    /^\d{1,2}-\d{1,2}-\d{2}$/, // MM-DD-YY
  ];
  if (nonEmptyValues.every(v => datePatterns.some(pattern => pattern.test(v)))) {
    return 'date';
  }
  
  // Check if it's a number field
  if (nonEmptyValues.every(v => !isNaN(Number(v)) && v.trim() !== '')) {
    return 'number';
  }
  
  // Check if it's a select field (limited unique values)
  const uniqueValues = [...new Set(nonEmptyValues)];
  if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
    return 'select';
  }
  
  return 'text';
}

// Detect CSV format based on headers
function detectCSVFormat(headers: string[]): string {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  
  // Sage 50 detection
  if (headerSet.has('customer id') && headerSet.has('bill to address-line one')) {
    return 'SAGE_50';
  }
  
  // QuickBooks detection
  if (headerSet.has('customer') && headerSet.has('phone') && headerSet.has('balance')) {
    return 'QUICKBOOKS';
  }
  
  return 'GENERIC';
}

// Validate CSV data
function validateCSVData(data: any): { isValid: boolean; errors: string[] } {
  const errors = [];
  
  // Required fields
  if (!data.name?.trim()) errors.push('Name is required');
  if (!data.phone?.trim()) errors.push('Phone is required');
  
  // Format validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Phone validation (basic)
  if (data.phone && data.phone.replace(/\D/g, '').length < 10) {
    errors.push('Phone number must have at least 10 digits');
  }
  
  return { isValid: errors.length === 0, errors };
}

export class CSVImportService {
  // Helper function to parse CSV line properly with enhanced character handling
  static parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    let escaped = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (escaped) {
        // Handle escaped characters
        switch (char) {
          case 'n':
            current += '\n';
            break;
          case 't':
            current += '\t';
            break;
          case 'r':
            current += '\r';
            break;
          case '\\':
            current += '\\';
            break;
          case '"':
            current += '"';
            break;
          default:
            current += char; // Include the escape character as-is
        }
        escaped = false;
      } else if (char === '\\' && nextChar && /[ntr\\"]/.test(nextChar)) {
        // Start of escape sequence
        escaped = true;
      } else if (char === '"') {
        // Handle quotes
        if (inQuotes && nextChar === '"') {
          // Escaped quote within quoted field
          current += '"';
          i++; // Skip the next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        // Regular character
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    // Clean up the values
    return result.map(value => {
      // Remove outer quotes and handle common special characters
      value = value.replace(/^"|"$/g, '');
      
      // Handle common encoding issues
      value = value
        .replace(/[\u2018\u2019]/g, "'") // Smart quotes to regular quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes to regular quotes
        .replace(/[\u2013\u2014]/g, '-') // Em dashes to regular dashes
        .replace(/[\u00A0]/g, ' ') // Non-breaking space to regular space
        .replace(/[\u2022]/g, '•') // Bullet points
        .replace(/[\u2026]/g, '...') // Ellipsis
        .replace(/[\u00AE]/g, '(R)') // Registered trademark
        .replace(/[\u00A9]/g, '(C)') // Copyright
        .replace(/[\u2122]/g, '(TM)') // Trademark
        .replace(/[\u00B0]/g, '°') // Degree symbol
        .replace(/[\u00F7]/g, '÷') // Division symbol
        .replace(/[\u00D7]/g, '×') // Multiplication symbol
        .replace(/[\u2260]/g, '≠') // Not equal
        .replace(/[\u2264]/g, '≤') // Less than or equal
        .replace(/[\u2265]/g, '≥') // Greater than or equal
        .replace(/[\u00B1]/g, '±') // Plus-minus
        .replace(/[\u2211]/g, '∑') // Summation
        .replace(/[\u221A]/g, '√') // Square root
        .replace(/[\u221E]/g, '∞') // Infinity
        .replace(/[\u03C0]/g, 'π') // Pi
        .replace(/[\u03A9]/g, 'Ω') // Omega
        .replace(/[\u00B2]/g, '²') // Superscript 2
        .replace(/[\u00B3]/g, '³') // Superscript 3
        .replace(/[\u2082]/g, '₂') // Subscript 2
        .replace(/[\u2083]/g, '₃'); // Subscript 3
      
      // Normalize whitespace (but preserve intentional spaces)
      value = value.replace(/\s+/g, ' ').trim();
      
      return value;
    });
  }

  // Helper function to normalize file content and handle encoding issues
  static normalizeFileContent(fileContent: string): string {
    console.log('Normalizing content, original length:', fileContent.length);
    
    // Handle BOM (Byte Order Mark) if present
    let normalized = fileContent;
    if (normalized.charCodeAt(0) === 0xFEFF) {
      normalized = normalized.slice(1);
      console.log('BOM removed, new length:', normalized.length);
    }
    
    // Handle common encoding issues but preserve line endings
    normalized = normalized
      .replace(/[\uFFFD]/g, '?') // Replace invalid UTF-8 characters
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, ''); // Remove control characters except newlines (\n), carriage returns (\r), and tabs (\t)
    
    console.log('Final normalized length:', normalized.length);
    
    // Debug: Check how many lines we get after normalization
    const testLines = normalized.split('\n');
    console.log('Lines after normalization:', testLines.length);
    
    return normalized;
  }

  static async analyzeFile(fileContent: string): Promise<CSVAnalysis> {
    // Normalize the file content
    const normalizedContent = this.normalizeFileContent(fileContent);
    
    // Split into lines and filter out empty lines
    let lines = normalizedContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    // Parse headers from first line
    const headers = this.parseCSVLine(lines[0]);
    
    // Detect CSV format
    const detectedFormat = detectCSVFormat(headers);
    const formatConfig = CSV_FORMATS[detectedFormat as keyof typeof CSV_FORMATS];
    
    console.log('CSV Import Service: Detected format:', detectedFormat);
    console.log('CSV Import Service: Headers found:', headers.length);
    console.log('CSV Import Service: Sample headers:', headers.slice(0, 5));

    // Initialize sample data collection
    const sampleData: Record<string, string[]> = {};
    headers.forEach(header => {
      sampleData[header] = [];
    });

    // Collect values from first 10 rows for analysis
    const sampleRows = Math.min(10, lines.length - 1);
    for (let i = 1; i <= sampleRows; i++) {
      const values = this.parseCSVLine(lines[i]);
      headers.forEach((header, index) => {
        if (values[index] && values[index].trim() !== '') {
          sampleData[header].push(values[index]);
        }
      });
    }

    // Create field mapping
    const fieldMapping: Record<string, string> = {};
    const customFieldsToCreate: Array<{ name: string; type: string; values: string[] }> = [];
    const skippedFields: string[] = [];

    headers.forEach(header => {
      // Check if this field maps to a standard field first
      const standardField = formatConfig.fieldMappings[header];
      if (standardField) {
        fieldMapping[header] = standardField;
      } else if (formatConfig.skipFields.includes(header)) {
        // Fields in skipFields are typically not useful for customer records
        // but we'll allow them to be custom fields if the user wants them
        skippedFields.push(header);
        // Don't return here - let the user decide in the UI
        // The field will be available for custom field creation if user chooses
      } else {
        // This field is neither mapped to standard fields nor in skipFields
        // It should become a custom field by default
        const fieldType = inferFieldType(sampleData[header]);
        customFieldsToCreate.push({
          name: header,
          type: fieldType,
          values: sampleData[header]
        });
        // Map it to a custom field identifier
        fieldMapping[header] = `custom_${header}`;
      }
    });

    console.log('CSV Import Service: Field mapping completed');
    console.log('CSV Import Service: Standard fields:', Object.keys(fieldMapping).filter(key => !fieldMapping[key].startsWith('custom_')).length);
    console.log('CSV Import Service: Custom fields to create:', customFieldsToCreate.length);
    console.log('CSV Import Service: Skipped fields:', skippedFields.length);

    // Calculate estimated records
    const estimatedRecords = lines.length - 1;

    return {
      headers,
      totalRows: estimatedRecords,
      sampleData,
      fieldMapping,
      customFieldsToCreate,
      skippedFields,
      validationIssues: [],
      detectedFormat,
      estimatedRecords
    };
  }

  static async previewImport(analysis: CSVAnalysis): Promise<ImportPreview> {
    const formatConfig = CSV_FORMATS[analysis.detectedFormat as keyof typeof CSV_FORMATS];
    
    // Create sample customer data for preview using actual CSV data
    const sampleData: any[] = [];
    const sampleRows = Math.min(3, analysis.totalRows);
    
    // Convert the sample data from the analysis into preview format
    if (analysis.sampleData && Object.keys(analysis.sampleData).length > 0) {
      // Get the first few rows of actual data
      const headers = analysis.headers;
      const maxSampleRows = Math.min(sampleRows, Math.max(...Object.values(analysis.sampleData).map(arr => arr.length)));
      
      for (let i = 0; i < maxSampleRows; i++) {
        const sampleCustomer: any = {};
        
        // Map each field from the CSV data
        headers.forEach(header => {
          const values = analysis.sampleData[header];
          if (values && values[i]) {
            const mappedField = analysis.fieldMapping[header];
            if (mappedField && !mappedField.startsWith('custom_')) {
              // Standard field
              sampleCustomer[mappedField] = values[i];
            } else {
              // Custom field
              if (!sampleCustomer.customFields) sampleCustomer.customFields = {};
              sampleCustomer.customFields[header] = values[i];
            }
          }
        });
        
        // Add default values for missing fields
        sampleCustomer.tags = sampleCustomer.tags || [];
        sampleCustomer.ownershipHistory = sampleCustomer.ownershipHistory || [];
        
        sampleData.push(sampleCustomer);
      }
    }

    return {
      detectedFormat: formatConfig.name,
      fieldMappings: analysis.fieldMapping,
      sampleData,
      estimatedRecords: analysis.estimatedRecords,
      warnings: analysis.validationIssues,
      customFieldsToCreate: analysis.customFieldsToCreate
    };
  }

  static async processCustomerData(
    row: any, 
    fieldMapping: Record<string, string>, 
    rowNumber: number
  ): Promise<{ data: any; errors: string[] }> {
    const customerData: any = {
      ownershipHistory: [],
      customFields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const errors: string[] = [];

    // Process each field
    Object.entries(fieldMapping).forEach(([header, mappedField]) => {
      const value = row[header];
      
      if (mappedField.startsWith('custom_')) {
        // This is a custom field - extract the original field name
        const customFieldName = mappedField.replace('custom_', '');
        customerData.customFields[customFieldName] = value;
      } else {
        // This is a standard field
        switch (mappedField) {
          case 'name':
            customerData.name = sanitizeString(value);
            break;
          case 'phone':
            customerData.phone = sanitizePhone(value);
            break;
          case 'address1':
            customerData.address1 = sanitizeString(value);
            break;
          case 'address2':
            customerData.address2 = sanitizeString(value);
            break;
          case 'city':
            customerData.city = sanitizeString(value);
            break;
          case 'state':
            customerData.state = sanitizeString(value);
            break;
          case 'zip':
            customerData.zip = sanitizeString(value);
            break;
          case 'email':
            customerData.email = sanitizeEmail(value);
            break;
          case 'secondaryContactName':
            customerData.secondaryContactName = sanitizeString(value);
            break;
          case 'secondaryContactPhone':
            customerData.secondaryContactPhone = sanitizePhone(value);
            break;
          case 'tags':
            if (value) {
              const tags = value.split(',').map((tag: string) => tag.trim().toLowerCase());
              customerData.tags = sanitizeTags(tags);
            }
            break;
          case 'customerType':
            customerData.customerType = sanitizeString(value);
            break;
          case 'notes':
            customerData.notes = sanitizeString(value);
            break;
          case 'ownershipHistory':
            // Handle ownership history - if it's a string, create a single record
            if (value && value.trim()) {
              customerData.ownershipHistory = [{
                name: sanitizeString(value),
                timestamp: customerData.createdDate ? new Date(customerData.createdDate) : new Date(),
                current: true
              }];
            }
            break;
          case 'accountNumber':
            customerData.accountNumber = sanitizeString(value);
            break;
          case 'createdDate':
            customerData.createdDate = value;
            break;
          case 'lastActivity':
            customerData.lastActivity = value;
            break;
          default:
            // Any other standard fields that aren't explicitly handled
            // Store them as custom fields to preserve the data
            customerData.customFields[header] = value;
            break;
        }
      }
    });

    // Combine address components
    const addressParts = [
      customerData.address1,
      customerData.address2,
      customerData.city,
      customerData.state,
      customerData.zip
    ].filter(Boolean);
    customerData.address = addressParts.join(', ');

    // If no address was built from components, try to use a single address field
    if (!customerData.address && customerData.address1) {
      customerData.address = customerData.address1;
    }

    // Clean up temporary address fields
    delete customerData.address1;
    delete customerData.address2;
    delete customerData.city;
    delete customerData.state;
    delete customerData.zip;

    // Ensure tags array exists
    if (!customerData.tags) {
      customerData.tags = [];
    }

    // Auto-create ownership history if none exists and we have customer name and created date
    if (!customerData.ownershipHistory || customerData.ownershipHistory.length === 0) {
      if (customerData.name && customerData.createdDate) {
        customerData.ownershipHistory = [{
          name: sanitizeString(customerData.name),
          timestamp: new Date(customerData.createdDate),
          current: true
        }];
      } else if (customerData.name) {
        // If no created date, use current date
        customerData.ownershipHistory = [{
          name: sanitizeString(customerData.name),
          timestamp: new Date(),
          current: true
        }];
      }
    }

    // Validate customer data
    const validation = validateCSVData(customerData);
    if (!validation.isValid) {
      errors.push(...validation.errors.map(error => `Row ${rowNumber}: ${error}`));
    }

    // Ensure name is not just whitespace
    if (!customerData.name?.trim()) {
      errors.push(`Row ${rowNumber}: Empty or invalid name`);
    }

    return { data: customerData, errors };
  }
}
