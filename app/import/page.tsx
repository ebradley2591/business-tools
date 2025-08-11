'use client';

import { useState } from 'react';
import { Upload, FileText, Eye, Edit3, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { CSVAnalysis, ImportPreview, FIELD_DISPLAY_NAMES } from '@/lib/csv-import-service';

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<CSVAnalysis | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'overwrite'>('skip');
  const { getAuthToken } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setSelectedFile(selectedFile);
      setUploadStatus('idle');
      setMessage('');
      setAnalysis(null);
      setPreview(null);
      setShowPreview(false);
      setShowFieldMapping(false);
      setCustomMappings({});
      
      // Automatically analyze the file
      await analyzeFile(selectedFile);
    } else {
      setMessage('Please select a valid CSV file.');
      setUploadStatus('error');
    }
  };

  const analyzeFile = async (selectedFile: File) => {
    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setAnalysis(data.analysis);
        setPreview(data.preview);
        
        // Initialize custom mappings based on the analysis
        const initialMappings: Record<string, string> = {};
        data.analysis.headers.forEach((header: string) => {
          const mapping = data.analysis.fieldMapping[header];
          if (mapping?.startsWith('custom_')) {
            initialMappings[header] = 'custom';
          } else if (data.analysis.skippedFields.includes(header)) {
            initialMappings[header] = 'skip';

          } else if (mapping) {
            initialMappings[header] = mapping;
          } else {
            // Default unmapped fields to 'custom'
            initialMappings[header] = 'custom';
          }
        });
        

        
        setCustomMappings(initialMappings);
        
        setMessage(`File analyzed successfully. Detected format: ${data.preview.detectedFormat}`);
        setUploadStatus('success');
      } else {
        setMessage(data.error || 'Failed to analyze file.');
        setUploadStatus('error');
      }
    } catch (error) {
      setMessage('An error occurred during analysis.');
      setUploadStatus('error');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateFieldMappings = async () => {
    if (!analysis) return;

    setAnalyzing(true);
    
    // Sanitize mappings to prevent corruption
    const sanitizedMappings = { ...customMappings };
    Object.keys(sanitizedMappings).forEach(key => {
      // Fix any corrupted 'ship' values to 'skip'
      if (sanitizedMappings[key] === 'ship') {
        sanitizedMappings[key] = 'skip';
      }
    });
    
    // If any values were fixed, update the state
    if (JSON.stringify(sanitizedMappings) !== JSON.stringify(customMappings)) {
      setCustomMappings(sanitizedMappings);
    }
    

    
    try {
      const token = await getAuthToken();
      const requestBody = {
        headers: analysis.headers,
        customMappings: sanitizedMappings, // Use sanitized mappings
        duplicateHandling
      };

      
      const response = await fetch('/api/import/map-fields', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the analysis with the new field mapping received from the API
        setAnalysis(prev => prev ? {
          ...prev,
          fieldMapping: data.fieldMapping,
          customFieldsToCreate: data.customFieldsToCreate,
          skippedFields: data.skippedFields
        } : null);
        
        // Update the preview
        setPreview(data.preview);
        
        setMessage('Field mappings updated successfully.');
        setUploadStatus('success');
        setShowFieldMapping(false);
      } else {

        setMessage(data.error || 'Failed to update field mappings.');
        setUploadStatus('error');
      }
    } catch (error) {

      setMessage('An error occurred while updating field mappings.');
      setUploadStatus('error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus('idle');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('customMappings', JSON.stringify(customMappings));
    formData.append('duplicateHandling', duplicateHandling);

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        let message = '';
        
        // Log detailed import results to console for debugging
        console.log('Import Results:', {
          total: data.total,
          imported: data.imported,
          duplicates: data.duplicates,
          skipped: data.skipped,
          failed: data.failed,
          batches: data.batches,
          customFieldsCreated: data.customFieldsCreated
        });
        
        // Show different messages based on what happened
        if (data.imported > 0) {
          message = `Successfully imported ${data.imported} new customers.`;
        } else if (data.duplicates > 0 && data.imported === 0) {
          // When no new imports but duplicates were handled
          message = `Successfully processed ${data.duplicates} existing customers.`;
        } else {
          message = 'Import completed successfully.';
        }
        
        // Add details about total records processed
        message += ` Total records processed: ${data.total}.`;
        
        // Add details about batches processed
        if (data.batches > 0) {
          message += ` Processed in ${data.batches} batch${data.batches > 1 ? 'es' : ''}.`;
        }
        
        // Add details about custom fields
        if (data.customFieldsCreated > 0) {
          message += ` Created ${data.customFieldsCreated} custom fields automatically.`;
        }
        
        // Add details about how duplicates were handled based on the duplicateHandling setting
        if (data.duplicates > 0) {
          if (duplicateHandling === 'update') {
            message += ` Updated ${data.duplicates} existing customers.`;
          } else if (duplicateHandling === 'overwrite') {
            message += ` Overwrote ${data.duplicates} existing customers.`;
          } else {
            message += ` Found ${data.duplicates} duplicate customers.`;
          }
        }
        
        // Add details about skipped records
        if (data.skipped > 0) {
          message += ` Skipped ${data.skipped} duplicate customers.`;
        }
        
        // Add details about failed records
        if (data.failed > 0) {
          message += ` Failed to process ${data.failed} records due to errors.`;
        }
        
        setMessage(message);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadStatus('error');
        setMessage(data.error || 'Failed to import customers.');
      }
    } catch (error) {
      setUploadStatus('error');
      setMessage('An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Customers</h1>
        <p className="mt-2 text-gray-600">
          Upload a CSV file to import customer data into the directory.
        </p>
        {/* Debug panel for developers - will show in browser console */}
        <div className="hidden" suppressHydrationWarning>
          <span style={{ display: 'none' }}>
            {/* Using useEffect in a component would be better, but this is a quick fix */}
            {typeof window !== 'undefined' && 
              console.log('Current import state:', {
                selectedFile: selectedFile?.name,
                analyzing,
                uploading,
                uploadStatus,
                duplicateHandling,
                hasAnalysis: !!analysis,
                hasPreview: !!preview,
                mappingsCount: Object.keys(customMappings).length
              })
            }
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Smart CSV Import</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">Duplicate Handling</h3>
                <p className="text-xs text-yellow-700 mb-3">
                  Choose how to handle customers that already exist in the system:
                </p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="skip"
                      checked={duplicateHandling === 'skip'}
                      onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'overwrite')}
                      className="text-yellow-600"
                    />
                    <span className="text-sm text-yellow-800">
                      <strong>Skip duplicates</strong> - Leave existing customers unchanged
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="update"
                      checked={duplicateHandling === 'update'}
                      onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'overwrite')}
                      className="text-yellow-600"
                    />
                    <span className="text-sm text-yellow-800">
                      <strong>Update existing</strong> - Merge new data with existing customer records
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="duplicateHandling"
                      value="overwrite"
                      checked={duplicateHandling === 'overwrite'}
                      onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'overwrite')}
                      className="text-yellow-600"
                    />
                    <span className="text-sm text-yellow-800">
                      <strong>Overwrite completely</strong> - Replace existing customer records with new data
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{selectedFile.name}</span>
                  <span className="text-sm text-gray-500">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                {analysis && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {preview?.detectedFormat}
                    </span>
                    <button
                      onClick={() => setShowFieldMapping(true)}
                      className="btn-secondary flex items-center text-xs"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Map Fields
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="btn-secondary flex items-center text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </button>
                  </div>
                )}
              </div>

              {analysis && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Import Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Rows:</span>
                      <span className="ml-1 font-medium">{analysis.totalRows}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Standard Fields:</span>
                      <span className="ml-1 font-medium">
                        {Object.keys(analysis.fieldMapping).filter(key => !analysis.fieldMapping[key].startsWith('custom_')).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Custom Fields:</span>
                      <span className="ml-1 font-medium">{analysis.customFieldsToCreate.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Optional Fields:</span>
                      <span className="ml-1 font-medium">{analysis.skippedFields.length}</span>
                    </div>
                  </div>
                  {analysis.validationIssues.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 mb-2">Validation Issues Found</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {analysis.validationIssues.map((issue: string, index: number) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {uploadStatus !== 'idle' && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              uploadStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {uploadStatus === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{message}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading || analyzing}
            className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Customers
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Security Notice</h3>
        <p className="text-sm text-blue-700">
          All customer data is encrypted and stored securely. Access is restricted to authenticated users only.
        </p>
      </div>

      {/* Field Mapping Modal */}
      {showFieldMapping && analysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Customize Field Mappings
              </h2>
              <button
                onClick={() => setShowFieldMapping(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">

              <div className="space-y-4">
                {analysis.headers.map((header: string) => {
                  const currentMapping = analysis.fieldMapping[header];
                  const isCustom = currentMapping?.startsWith('custom_');
                  const defaultSkipped = analysis.skippedFields.includes(header);
                  const userOverride = customMappings[header];
                  
                  // Determine the default value for the select input
                  let defaultValue = '';
                  if (userOverride) {
                    defaultValue = userOverride;
                  } else if (defaultSkipped) {
                    defaultValue = 'skip'; // Default skipFields to 'skip'
                  } else if (isCustom) {
                    defaultValue = 'custom';
                  } else if (currentMapping) {
                    defaultValue = currentMapping;
                  }
                  
                  const isSkipped = defaultValue === 'skip';
                  
                  return (
                    <div key={header} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">{header}</h4>

                          <div className="flex items-center space-x-4">
                            <select
                              value={defaultValue}
                              onChange={(e) => {
                                const newMappings = { ...customMappings };
                                const value = e.target.value;
                                
                                // Validate the value to prevent corruption
                                if (value === 'skip') {
                                  // Double check that we're using the correct string
                                  const skipValue = 'skip';
                                  newMappings[header] = skipValue;

                                } else if (value === 'custom') {
                                  newMappings[header] = 'custom';
                                } else {
                                  newMappings[header] = value;
                                }
                                setCustomMappings(newMappings);
                              }}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            >
                              <option value="">Select mapping...</option>
                              <option value="skip">Skip this column</option>
                              <option value="custom">Create as custom field</option>
                              <optgroup label="Standard Fields">
                                {Object.entries(FIELD_DISPLAY_NAMES).map(([key, displayName]) => (
                                  <option key={key} value={key}>{displayName}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        </div>
                        <div className="ml-4 text-sm text-gray-500">
                          {isSkipped ? (
                            <span className="text-red-600">Skipped</span>
                          ) : defaultValue === 'custom' ? (
                            <span className="text-green-600">Custom Field</span>
                          ) : currentMapping ? (
                            <span className="text-blue-600">
                              → {FIELD_DISPLAY_NAMES[currentMapping] || currentMapping}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not mapped</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowFieldMapping(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={updateFieldMappings}
                disabled={analyzing}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Mappings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showPreview && preview && analysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Import Preview - {preview.detectedFormat}
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Field Mappings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Field Mappings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Standard Fields</h4>
                    <div className="space-y-1">
                      {Object.entries(analysis.fieldMapping)
                        .filter(([, value]) => !(value as string).startsWith('custom_'))
                        .map(([csvField, targetField]) => (
                          <div key={csvField} className="text-sm">
                            <span className="text-gray-600">{csvField}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium text-blue-600">
                              {FIELD_DISPLAY_NAMES[targetField as string] || targetField}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Custom Fields</h4>
                    <div className="space-y-1">
                      {analysis.customFieldsToCreate.map((field: any) => (
                        <div key={field.name} className="text-sm">
                          <span className="text-gray-600">{field.name}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-green-600">Custom Field ({field.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Data */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Sample Data Preview</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2">Name</th>
                          <th className="text-left py-2 px-2">Phone</th>
                          <th className="text-left py-2 px-2">Address</th>
                          <th className="text-left py-2 px-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleData.map((customer: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 px-2">{customer.name}</td>
                            <td className="py-2 px-2">{customer.phone}</td>
                            <td className="py-2 px-2">{customer.address}</td>
                            <td className="py-2 px-2">{customer.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Import Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Import Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{preview.estimatedRecords}</div>
                      <div className="text-sm text-gray-600">Total Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Object.keys(analysis.fieldMapping).filter(key => !analysis.fieldMapping[key].startsWith('custom_')).length}
                      </div>
                      <div className="text-sm text-gray-600">Standard Fields</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{analysis.customFieldsToCreate.length}</div>
                      <div className="text-sm text-gray-600">Custom Fields</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{analysis.skippedFields.length}</div>
                      <div className="text-sm text-gray-600">Optional Fields</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-3">Warnings</h3>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <ul className="text-sm text-orange-800 space-y-1">
                      {preview.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug information panel - visible to users */}
      {uploadStatus === 'success' && (
        <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Import Details (for troubleshooting)
          </h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>Please check your browser&apos;s console (F12 then Console tab) for detailed import logs.</p>
            <p>If you&apos;re experiencing issues with imports, please share these details with support.</p>
          </div>
        </div>
      )}
    </div>
  );
}
