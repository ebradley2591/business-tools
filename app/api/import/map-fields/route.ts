import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';
import { CSVImportService, CSVAnalysis } from '@/lib/csv-import-service';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { headers, customMappings, duplicateHandling = 'skip' } = body;

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json({ error: 'Invalid headers provided' }, { status: 400 });
    }

    if (!customMappings || typeof customMappings !== 'object') {
      return NextResponse.json({ error: 'Invalid custom mappings provided' }, { status: 400 });
    }

    console.log('Map Fields API: User authenticated:', user.email);
    console.log('Map Fields API: Headers count:', headers.length);
    console.log('Map Fields API: Custom mappings:', Object.keys(customMappings).length);
    console.log('Map Fields API: Duplicate handling:', duplicateHandling);

    // Validate custom mappings - allow "custom" as a valid mapping
    const validMappings = ['name', 'phone', 'email', 'address', 'secondaryContactName', 'secondaryContactPhone', 'notes', 'tags', 'ownershipHistory', 'customerType', 'accountNumber', 'createdDate', 'lastActivity', 'custom', 'skip'];
    
    const invalidMappings = Object.values(customMappings).filter(mapping => !validMappings.includes(mapping as string));
    if (invalidMappings.length > 0) {
      console.log('Map Fields API: Invalid mappings found:', invalidMappings);
      return NextResponse.json({ 
        error: 'Invalid field mappings provided', 
        invalidMappings 
      }, { status: 400 });
    }

    // Create a mock analysis object for preview generation
    const mockAnalysis: CSVAnalysis = {
      headers,
      totalRows: 1, // Set to 1 for preview generation
      sampleData: {},
      fieldMapping: {},
      customFieldsToCreate: [],
      skippedFields: [],
      validationIssues: [],
      detectedFormat: 'CUSTOM',
      estimatedRecords: 1
    };

    // Apply custom mappings to create field mapping
    const fieldMapping: Record<string, string> = {};
    const customFieldsToCreate: Array<{ name: string; type: string; values: string[] }> = [];
    const skippedFields: string[] = [];

    headers.forEach(header => {
      const mapping = customMappings[header];
      
      if (mapping === 'skip') {
        skippedFields.push(header);
      } else if (mapping === 'custom') {
        fieldMapping[header] = `custom_${header}`;
        // For custom fields, we'll infer the type during actual import
        customFieldsToCreate.push({
          name: header,
          type: 'text', // Default type, will be inferred during import
          values: []
        });
      } else if (mapping && mapping !== '') {
        fieldMapping[header] = mapping;
      } else {
        // Default behavior: create as custom field
        fieldMapping[header] = `custom_${header}`;
        customFieldsToCreate.push({
          name: header,
          type: 'text', // Default type, will be inferred during import
          values: []
        });
      }
    });

    // Update the mock analysis with the field mapping
    mockAnalysis.fieldMapping = fieldMapping;
    mockAnalysis.customFieldsToCreate = customFieldsToCreate;
    mockAnalysis.skippedFields = skippedFields;

    console.log('Map Fields API: Field mapping created:', {
      fieldMapping,
      customFieldsToCreate: customFieldsToCreate.map(f => f.name),
      skippedFields
    });

    // Generate preview
    const preview = await CSVImportService.previewImport(mockAnalysis);

    console.log('Map Fields API: Field mapping completed:', {
      standardFields: Object.keys(fieldMapping).filter(key => !fieldMapping[key].startsWith('custom_')).length,
      customFields: customFieldsToCreate.length,
      skippedFields: skippedFields.length
    });

    return NextResponse.json({
      success: true,
      fieldMapping,
      customFieldsToCreate,
      skippedFields,
      preview: {
        detectedFormat: preview.detectedFormat,
        fieldMappings: preview.fieldMappings,
        sampleData: preview.sampleData,
        estimatedRecords: preview.estimatedRecords,
        warnings: preview.warnings,
        customFieldsToCreate: preview.customFieldsToCreate
      }
    });

  } catch (error) {
    console.error('Map Fields API: Error processing field mapping:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Field mapping failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Field mapping failed' 
    }, { status: 500 });
  }
}
