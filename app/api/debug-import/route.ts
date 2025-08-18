import { NextRequest, NextResponse } from 'next/server';
import { CSVImportService } from '@/lib/csv-import-service';

/**
 * Debug endpoint for testing CSV import validation
 * This endpoint doesn't require authentication and is for testing only
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { sampleData } = await request.json();
    
    if (!sampleData) {
      return NextResponse.json({ error: 'No sample data provided' }, { status: 400 });
    }
    
    // Log the sample data
    console.log('Debug import - received sample data:', JSON.stringify(sampleData));
    
    // Process the sample data through validation
    const result: {
      validationResults: Array<{
        index: number;
        valid: boolean;
        errors: string[];
        data: any;
      }>;
      processedData: any[];
    } = {
      validationResults: [],
      processedData: []
    };
    
    // Test with different field mappings
    const fieldMapping = {
      'Customer Name': 'name',
      'Phone': 'phone',
      'Address': 'address',
      'Email': 'email',
      'Customer ID': 'customerId'
    };
    
    // Process each sample record
    for (let i = 0; i < sampleData.length; i++) {
      const record = sampleData[i];
      console.log(`Processing debug record ${i}:`, JSON.stringify(record));
      
      try {
        // Process the record using the CSV import service
        const processResult = await CSVImportService.processCustomerData(record, fieldMapping, i);
        
        // Add the result to our response
        result.validationResults.push({
          index: i,
          valid: processResult.errors.length === 0,
          errors: processResult.errors,
          data: record
        });
        
        result.processedData.push(processResult.data);
      } catch (error) {
        console.error(`Error processing debug record ${i}:`, error);
        result.validationResults.push({
          index: i,
          valid: false,
          errors: ['Processing error: ' + (error instanceof Error ? error.message : String(error))],
          data: record
        });
      }
    }
    
    // Return the validation results
    return NextResponse.json({
      success: true,
      message: 'Debug import validation completed',
      result
    });
    
  } catch (error) {
    console.error('Debug import error:', error);
    return NextResponse.json({ 
      error: 'Debug import error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
