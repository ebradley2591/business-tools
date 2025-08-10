import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';
import { CSVImportService } from '@/lib/csv-import-service';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size and type
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    console.log('Analyze API: User authenticated:', user.email);
    console.log('Analyze API: File received:', file.name, file.size, 'bytes');

    const fileContent = await file.text();
    
    // Validate file content length
    if (fileContent.length > 5 * 1024 * 1024) { // 5MB content limit
      return NextResponse.json({ error: 'File content too large' }, { status: 400 });
    }

    // Analyze the CSV file using the service
    const analysis = await CSVImportService.analyzeFile(fileContent);
    
    console.log('Analyze API: Analysis completed:', {
      format: analysis.detectedFormat,
      totalRows: analysis.totalRows,
      headers: analysis.headers.length,
      standardFields: Object.keys(analysis.fieldMapping).filter(key => !analysis.fieldMapping[key].startsWith('custom_')).length,
      customFields: analysis.customFieldsToCreate.length,
      skippedFields: analysis.skippedFields.length
    });

    // Generate preview data
    const preview = await CSVImportService.previewImport(analysis);

    return NextResponse.json({
      success: true,
      analysis: {
        headers: analysis.headers,
        totalRows: analysis.totalRows,
        detectedFormat: analysis.detectedFormat,
        estimatedRecords: analysis.estimatedRecords,
        fieldMapping: analysis.fieldMapping,
        customFieldsToCreate: analysis.customFieldsToCreate,
        skippedFields: analysis.skippedFields,
        validationIssues: analysis.validationIssues
      },
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
    console.error('Analyze API: Error analyzing file:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'File analysis failed', 
        details: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'File analysis failed' 
    }, { status: 500 });
  }
}
