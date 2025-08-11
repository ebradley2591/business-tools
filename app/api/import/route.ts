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

    
    // Check if a custom field with this name already exists for this tenant
    const existingFieldQuery = await adminDb.collection('customFields')
      .where('tenant_id', '==', tenantId)
      .where('name', '==', fieldName)
      .limit(1)
      .get();
    
    if (!existingFieldQuery.empty) {
      // Field already exists, return the existing field ID

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



    const docRef = await adminDb.collection('customFields').add(customFieldData);

    return docRef.id;
  } catch (error) {

    return null;
  }
}

// Helper function to check for duplicate customers
async function checkForDuplicates(
  customerData: any,
  existingCustomers: any[]
): Promise<{ isDuplicate: boolean; existingCustomer?: any; duplicateReason: string }> {
  // Check by Customer ID first (most reliable if available)
  if (customerData.customerId) {
    const idDuplicate = existingCustomers.find(c => 
      c.customerId && c.customerId.toString().trim() === customerData.customerId.toString().trim()
    );
    if (idDuplicate) {
      return { 
        isDuplicate: true, 
        existingCustomer: idDuplicate, 
        duplicateReason: 'Customer ID already exists' 
      };
    }
  }

  // Check by phone number (second most reliable)
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
  
  // Check by name (least reliable, but still useful)
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
      console.log('Starting CSV import process');
      
      const user = await verifyTenantAdminAccess(req);
      
      if (!user) {
        console.log('Unauthorized access attempt - missing or invalid tenant admin credentials');
        return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
      }
      
      console.log(`Authorized import for tenant: ${user.tenant_id}`);
      

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



      const fileContent = await file.text();
      
      // Validate file content length
      if (fileContent.length > 5 * 1024 * 1024) { // 5MB content limit
        return NextResponse.json({ error: 'File content too large' }, { status: 400 });
      }

      // Get existing customers for duplicate checking
      console.log(`Fetching existing customers for tenant: ${user.tenant_id} for duplicate checking`);
      
      // Remove any potential limit on the query and explicitly set a high limit
      const existingCustomersSnapshot = await adminDb.collection('customers')
        .where('tenant_id', '==', user.tenant_id)
        .limit(10000) // Set a very high limit to ensure we get all records
        .get();
      
      const existingCustomers = existingCustomersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${existingCustomers.length} existing customers for duplicate checking`);



      // Normalize and analyze the CSV file using the new service
      const normalizedContent = CSVImportService.normalizeFileContent(fileContent);
      let analysis = await CSVImportService.analyzeFile(normalizedContent);
      
      // Apply custom mappings to the analysis
      if (Object.keys(customMappings).length > 0) {

        
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
      


      // Create custom fields in the database
      const createdCustomFields: Record<string, string> = {};

      
      for (const customField of analysis.customFieldsToCreate) {
        const fieldId = await createCustomField(user.tenant_id, customField.name, customField.type as any, customField.values);
        if (fieldId) {
          createdCustomFields[customField.name] = fieldId;
        }
      }
      


      // Process all rows using normalized content
      const lines = normalizedContent.split('\n').filter(line => line.trim());
      const customers = [];
      const errors: Array<{ row: number; field: string; error: string; data: any }> = [];
      const duplicates: Array<{ row: number; customer: any; existingCustomer: any; reason: string }> = [];
      const skipped: Array<{ row: number; customer: any; reason: string }> = [];



      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {

          continue;
        }

        const values = CSVImportService.parseCSVLine(line);
        const row: any = {};

        analysis.headers.forEach((header, index) => {
          row[header] = values[index] || '';
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

              
              // Add to duplicates array for reporting
              duplicates.push({
                row: i,
                customer: result.data,
                existingCustomer: existingCustomer,
                reason: `Updated: ${duplicateCheck.duplicateReason}`
              });
            } catch (error) {

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

              
              // Add to duplicates array for reporting
              duplicates.push({
                row: i,
                customer: result.data,
                existingCustomer: existingCustomer,
                reason: `Overwritten: ${duplicateCheck.duplicateReason}`
              });
            } catch (error) {

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



      // Check if adminDb is available
      if (!adminDb) {

        return NextResponse.json({ error: 'Database not available' }, { status: 500 });
      }

      // Insert new customers using batch processing to handle Firestore's 500 operations per batch limit
      const customersRef = adminDb.collection('customers');
      let importedCount = 0;
      let batchCount = 0;

      // Process in batches of 400 to stay safely under Firestore's 500 operations per batch limit
      const BATCH_SIZE = 400;
      
      console.log(`Starting batch import of ${customers.length} customers with batch size ${BATCH_SIZE}`);
      
      // Create batches of customers
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        try {
          const batch = adminDb.batch();
          const currentBatch = customers.slice(i, i + BATCH_SIZE);
          
          console.log(`Processing batch ${batchCount + 1} with ${currentBatch.length} customers (${i} to ${i + currentBatch.length - 1})`);
          
          // Add each customer in the current batch
          for (const customer of currentBatch) {
            const docRef = customersRef.doc();
            batch.set(docRef, {
              ...customer,
              createdAt: new Date(), // Ensure createdAt is set
              updatedAt: new Date()  // Ensure updatedAt is set
            });
          }
          
          // Commit the batch
          await batch.commit();
          
          // Update counts
          importedCount += currentBatch.length;
          batchCount++;
          
          console.log(`Successfully committed batch ${batchCount} with ${currentBatch.length} customers. Total imported: ${importedCount}`);
          
        } catch (error) {
          // If a batch fails, log the error and add each customer in the batch to the errors array
          console.error(`Error in batch ${batchCount + 1}:`, error);
          
          const failedBatch = customers.slice(i, i + BATCH_SIZE);
          for (const customer of failedBatch) {
            errors.push({
              row: 0,
              field: 'database',
              error: `Failed to save customer in batch ${batchCount + 1}: ${error}`,
              data: customer
            });
          }
        }
      }



      // Log summary before returning response
      console.log(`Import summary:
        - Total records processed: ${customers.length + errors.length + duplicates.length + skipped.length}
        - Successfully imported: ${importedCount}
        - Duplicates processed: ${duplicates.length}
        - Skipped records: ${skipped.length}
        - Failed records: ${errors.length}
        - Batches processed: ${batchCount}
        - Custom fields created: ${Object.keys(createdCustomFields).length}
      `);
      
      return NextResponse.json({ 
        success: true, 
        imported: importedCount,
        failed: errors.length,
        total: customers.length + errors.length + duplicates.length + skipped.length,
        customFieldsCreated: Object.keys(createdCustomFields).length,
        duplicates: duplicates.length,
        skipped: skipped.length,
        batches: batchCount,
        errors: errors.slice(0, 10), // Limit error response
        warnings: analysis.validationIssues,
        fieldMapping: analysis.fieldMapping
      });
    } catch (error) {

      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
