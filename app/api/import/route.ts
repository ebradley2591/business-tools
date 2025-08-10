import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';
import { withImportRateLimit } from '@/lib/rate-limit';
import { CSVImportService } from '@/lib/csv-import-service';

// Helper function to create custom field
async function createCustomField(
  tenantId: string,
  fieldName: string,
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select',
  sampleValues: string[]
) {
  try {
    console.log(`Import API: Creating custom field '${fieldName}' for tenant ${tenantId} with type ${fieldType}`);
    console.log(`Import API: Sample values for '${fieldName}':`, sampleValues.slice(0, 5));
    
    // Check if a custom field with this name already exists for this tenant
    const existingFieldQuery = await adminDb.collection('customFields')
      .where('tenant_id', '==', tenantId)
      .where('name', '==', fieldName)
      .limit(1)
      .get();
    
    if (!existingFieldQuery.empty) {
      // Field already exists, return the existing field ID
      console.log(`Import API: Custom field '${fieldName}' already exists for tenant ${tenantId}, skipping creation`);
      return existingFieldQuery.docs[0].id;
    }

    // Get the next order number for new fields
    const existingFields = await adminDb.collection('customFields')
      .where('tenant_id', '==', tenantId)
      .get();
    
    const sortedFields = existingFields.docs
      .map(doc => doc.data())
      .sort((a, b) => (b.order || 0) - (a.order || 0));
    
    const nextOrder = sortedFields.length === 0 ? 1 : (sortedFields[0].order || 0) + 1;

    const customFieldData = {
      tenant_id: tenantId,
      name: fieldName,
      type: fieldType,
      required: false,
      description: `Auto-generated from CSV import: ${fieldName}`,
      order: nextOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add options for select fields
    if (fieldType === 'select') {
      const uniqueValues = [...new Set(sampleValues.filter(v => v && v.trim() !== ''))];
      (customFieldData as any).options = uniqueValues.slice(0, 20); // Limit to 20 options
    }

    console.log(`Import API: Custom field data for '${fieldName}':`, customFieldData);

    const docRef = await adminDb.collection('customFields').add(customFieldData);
    console.log(`Import API: Successfully created new custom field '${fieldName}' for tenant ${tenantId} with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`Import API: Error creating custom field '${fieldName}':`, error);
    return null;
  }
}

// Helper function to check for duplicate customers
async function checkForDuplicates(
  customerData: any,
  existingCustomers: any[]
): Promise<{ isDuplicate: boolean; existingCustomer?: any; duplicateReason: string }> {
  // Check by phone number (most reliable)
  if (customerData.phone) {
    const phoneDuplicate = existingCustomers.find(c => 
      c.phone === customerData.phone || 
      c.phone === customerData.phone.replace(/\D/g, '') ||
      customerData.phone.replace(/\D/g, '') === c.phone.replace(/\D/g, '')
    );
    if (phoneDuplicate) {
      return { 
        isDuplicate: true, 
        existingCustomer: phoneDuplicate, 
        duplicateReason: 'Phone number already exists' 
      };
    }
  }

  // Check by name (exact match)
  if (customerData.name) {
    const nameDuplicate = existingCustomers.find(c => 
      c.name.toLowerCase().trim() === customerData.name.toLowerCase().trim()
    );
    if (nameDuplicate) {
      return { 
        isDuplicate: true, 
        existingCustomer: nameDuplicate, 
        duplicateReason: 'Customer name already exists' 
      };
    }
  }

  // Check by email (if available)
  if (customerData.email) {
    const emailDuplicate = existingCustomers.find(c => 
      c.email && c.email.toLowerCase().trim() === customerData.email.toLowerCase().trim()
    );
    if (emailDuplicate) {
      return { 
        isDuplicate: true, 
        existingCustomer: emailDuplicate, 
        duplicateReason: 'Email address already exists' 
      };
    }
  }

  return { isDuplicate: false, duplicateReason: '' };
}

// Helper function to infer field type from sample values
function inferFieldType(values: string[]): 'text' | 'number' | 'date' | 'boolean' | 'select' {
  if (values.length === 0) return 'text';
  
  const nonEmptyValues = values.filter(v => v && v.trim() !== '');
  if (nonEmptyValues.length === 0) return 'text';
  
  // Check if all values are numbers
  const allNumbers = nonEmptyValues.every(v => !isNaN(Number(v)) && v.trim() !== '');
  if (allNumbers) return 'number';
  
  // Check if all values are dates
  const allDates = nonEmptyValues.every(v => {
    const date = new Date(v);
    return !isNaN(date.getTime()) && v.trim() !== '';
  });
  if (allDates) return 'date';
  
  // Check if all values are booleans
  const allBooleans = nonEmptyValues.every(v => 
    ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(v.toLowerCase().trim())
  );
  if (allBooleans) return 'boolean';
  
  // Check if it's a select field (limited unique values)
  const uniqueValues = [...new Set(nonEmptyValues)];
  if (uniqueValues.length <= 10 && uniqueValues.length > 1) return 'select';
  
  return 'text';
}

export async function POST(request: NextRequest) {
  return withImportRateLimit(async (req: NextRequest) => {
    try {
      const user = await verifyTenantAdminAccess(req);
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
      }

      const formData = await req.formData();
      const file = formData.get('file') as File;
      const customMappingsJson = formData.get('customMappings') as string;
      const duplicateHandling = formData.get('duplicateHandling') as string || 'skip'; // skip, update, or overwrite

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Parse custom mappings if provided
      let customMappings: Record<string, string> = {};
      if (customMappingsJson) {
        try {
          customMappings = JSON.parse(customMappingsJson);
        } catch (error) {
          console.error('Error parsing custom mappings:', error);
        }
      }

      // Validate file size and type
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
      }

      if (file.type !== 'text/csv') {
        return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
      }

      console.log('Import API: User authenticated:', user.email);
      console.log('Import API: File received:', file.name, file.size, 'bytes');
      console.log('Import API: Custom mappings:', customMappings);
      console.log('Import API: Duplicate handling:', duplicateHandling);

      const fileContent = await file.text();
      
      // Validate file content length
      if (fileContent.length > 5 * 1024 * 1024) { // 5MB content limit
        return NextResponse.json({ error: 'File content too large' }, { status: 400 });
      }

      // Get existing customers for duplicate checking
      const existingCustomersSnapshot = await adminDb.collection('customers')
        .where('tenant_id', '==', user.tenant_id)
        .get();
      
      const existingCustomers = existingCustomersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Import API: Found', existingCustomers.length, 'existing customers for duplicate checking');

      // Normalize and analyze the CSV file using the new service
      const normalizedContent = CSVImportService.normalizeFileContent(fileContent);
      let analysis = await CSVImportService.analyzeFile(normalizedContent);
      
      // Apply custom mappings to the analysis
      if (Object.keys(customMappings).length > 0) {
        console.log('Import API: Applying custom mappings to field mapping');
        
        // Reset the analysis based on custom mappings
        analysis.fieldMapping = {};
        analysis.customFieldsToCreate = [];
        analysis.skippedFields = [];
        
        // Process each field based on custom mappings
        analysis.headers.forEach(header => {
          const mapping = customMappings[header];
          
          if (mapping === 'skip') {
            // Add to skipped fields
            analysis.skippedFields.push(header);
          } else if (mapping === 'custom') {
            // Create a custom field mapping
            analysis.fieldMapping[header] = `custom_${header}`;
            
            // Infer field type from sample data
            const sampleValues = analysis.sampleData[header] || [];
            const fieldType = inferFieldType(sampleValues);
            analysis.customFieldsToCreate.push({
              name: header,
              type: fieldType,
              values: sampleValues
            });
          } else if (mapping && mapping !== '') {
            // Standard field mapping
            analysis.fieldMapping[header] = mapping;
          } else {
            // Default behavior: create as custom field
            analysis.fieldMapping[header] = `custom_${header}`;
            
            // Infer field type from sample data
            const sampleValues = analysis.sampleData[header] || [];
            const fieldType = inferFieldType(sampleValues);
            analysis.customFieldsToCreate.push({
              name: header,
              type: fieldType,
              values: sampleValues
            });
          }
        });
      }
      
      console.log('Import API: Analysis completed:', {
        format: analysis.detectedFormat,
        totalRows: analysis.totalRows,
        standardFields: Object.keys(analysis.fieldMapping).filter(key => !analysis.fieldMapping[key].startsWith('custom_')).length,
        customFields: analysis.customFieldsToCreate.length,
        skippedFields: analysis.skippedFields.length,
        customMappingsApplied: Object.keys(customMappings).length
      });

      // Create custom fields in the database
      const createdCustomFields: Record<string, string> = {};
      console.log('Import API: Starting custom field creation for', analysis.customFieldsToCreate.length, 'fields');
      console.log('Import API: Custom fields to create:', analysis.customFieldsToCreate.map(f => f.name));
      
      for (const customField of analysis.customFieldsToCreate) {
        console.log(`Import API: Processing custom field: ${customField.name} (type: ${customField.type})`);
        const fieldId = await createCustomField(user.tenant_id, customField.name, customField.type as any, customField.values);
        if (fieldId) {
          createdCustomFields[customField.name] = fieldId;
          console.log(`Import API: Custom field '${customField.name}' created/retrieved with ID: ${fieldId}`);
        } else {
          console.error(`Import API: Failed to create custom field '${customField.name}'`);
        }
      }
      
      console.log('Import API: Custom field creation completed. Created fields:', Object.keys(createdCustomFields));

      // Process all rows using normalized content
      const lines = normalizedContent.split('\n').filter(line => line.trim());
      const customers = [];
      const errors: Array<{ row: number; field: string; error: string; data: any }> = [];
      const duplicates: Array<{ row: number; customer: any; existingCustomer: any; reason: string }> = [];
      const skipped: Array<{ row: number; customer: any; reason: string }> = [];

      console.log('Import API: Processing', lines.length - 1, 'data rows');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          console.log('Import API: Skipping empty line at row', i);
          continue;
        }

        const values = CSVImportService.parseCSVLine(line);
        const row: any = {};

        analysis.headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        console.log('Import API: Processing row', i, 'with data:', {
          name: row['Customer Name'] || row['Name'] || 'No name',
          phone: row['Telephone 1'] || row['Phone'] || 'No phone',
          hasData: Object.values(row).some(val => val && typeof val === 'string' && val.trim() !== '')
        });

        // Process customer data using the service
        const result = await CSVImportService.processCustomerData(row, analysis.fieldMapping, i);
        
        if (result.errors.length > 0) {
          errors.push(...result.errors.map(error => ({
            row: i,
            field: 'general',
            error,
            data: row
          })));
          continue;
        }

        // Add tenant_id to customer data
        result.data.tenant_id = user.tenant_id;

        // Check for duplicates
        const duplicateCheck = await checkForDuplicates(result.data, existingCustomers);
        
        if (duplicateCheck.isDuplicate) {
          if (duplicateHandling === 'skip') {
            skipped.push({
              row: i,
              customer: result.data,
              reason: `Duplicate: ${duplicateCheck.duplicateReason}`
            });
            continue;
          } else if (duplicateHandling === 'update') {
            // Update existing customer with new data
            try {
              const existingCustomer = duplicateCheck.existingCustomer;
              const updateData = {
                ...result.data,
                updatedAt: new Date(),
                // Preserve existing ID and creation date
                id: existingCustomer.id,
                createdAt: existingCustomer.createdAt
              };
              
              await adminDb.collection('customers').doc(existingCustomer.id).update(updateData);
              console.log('Import API: Updated existing customer:', existingCustomer.name);
              
              // Add to duplicates array for reporting
              duplicates.push({
                row: i,
                customer: result.data,
                existingCustomer: existingCustomer,
                reason: `Updated: ${duplicateCheck.duplicateReason}`
              });
            } catch (error) {
              console.error('Import API: Error updating customer:', error);
              errors.push({
                row: i,
                field: 'database',
                error: `Failed to update existing customer: ${error}`,
                data: result.data
              });
            }
            continue;
          } else if (duplicateHandling === 'overwrite') {
            // Replace existing customer completely
            try {
              const existingCustomer = duplicateCheck.existingCustomer;
              const overwriteData = {
                ...result.data,
                updatedAt: new Date(),
                // Preserve existing ID but use new creation date
                id: existingCustomer.id,
                createdAt: new Date()
              };
              
              await adminDb.collection('customers').doc(existingCustomer.id).set(overwriteData);
              console.log('Import API: Overwrote existing customer:', existingCustomer.name);
              
              // Add to duplicates array for reporting
              duplicates.push({
                row: i,
                customer: result.data,
                existingCustomer: existingCustomer,
                reason: `Overwritten: ${duplicateCheck.duplicateReason}`
              });
            } catch (error) {
              console.error('Import API: Error overwriting customer:', error);
              errors.push({
                row: i,
                field: 'database',
                error: `Failed to overwrite existing customer: ${error}`,
                data: result.data
              });
            }
            continue;
          }
        }

        // No duplicate or duplicate handling completed, add to new customers
        customers.push(result.data);
      }

      console.log('Import API: Valid customers to import:', customers.length);
      console.log('Import API: Errors found:', errors.length);
      console.log('Import API: Duplicates handled:', duplicates.length);
      console.log('Import API: Skipped:', skipped.length);

      // Check if adminDb is available
      if (!adminDb) {
        console.error('Import API: Firebase Admin DB not initialized');
        return NextResponse.json({ error: 'Database not available' }, { status: 500 });
      }

      // Insert new customers
      const customersRef = adminDb.collection('customers');
      let importedCount = 0;

      for (const customer of customers) {
        try {
          await customersRef.add(customer);
          importedCount++;
          console.log('Import API: Successfully imported customer:', customer.name);
        } catch (error) {
          console.error('Import API: Error importing customer:', customer.name, error);
          errors.push({
            row: 0,
            field: 'database',
            error: `Failed to save customer: ${error}`,
            data: customer
          });
        }
      }

      console.log('Import API: Total imported:', importedCount);

      return NextResponse.json({ 
        success: true, 
        imported: importedCount,
        failed: errors.length,
        total: customers.length + errors.length + duplicates.length + skipped.length,
        customFieldsCreated: Object.keys(createdCustomFields).length,
        duplicates: duplicates.length,
        skipped: skipped.length,
        errors: errors.slice(0, 10), // Limit error response
        warnings: analysis.validationIssues,
        fieldMapping: analysis.fieldMapping
      });
    } catch (error) {
      console.error('Import API: Error processing import:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
