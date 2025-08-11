'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { Customer, CustomFieldDefinition } from '@/types/customer';
import { useAuth } from '@/components/AuthProvider';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAuthToken } = useAuth();

  useEffect(() => {
    if (params.id) {
      fetchCustomer(params.id as string);
      fetchCustomFields();
    }
  }, [params.id]);

  const fetchCustomer = async (id: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/customers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/custom-fields', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomFields(data);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatCustomFieldValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    
    switch (fieldType) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'select':
        return Array.isArray(value) ? value.join(', ') : String(value);
      default:
        return String(value);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Customer Information Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            </div>
            <div className="px-6 py-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                     <p className="text-sm text-gray-900 font-medium">{customer.customerId || 'Not assigned'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                     <p className="text-sm text-gray-900 font-medium">{customer.name}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                     <p className="text-sm text-gray-900">{customer.phone}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                     <p className="text-sm text-gray-900">{customer.email || 'Not provided'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Contact Name</label>
                     <p className="text-sm text-gray-900">{customer.secondaryContactName || 'Not provided'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Contact Phone</label>
                     <p className="text-sm text-gray-900">{customer.secondaryContactPhone || 'Not provided'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                     <p className="text-sm text-gray-900">{customer.customerType || 'Not provided'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                     <p className="text-sm text-gray-900">{customer.accountNumber || 'Not provided'}</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                     <p className="text-sm text-gray-900">{customer.address}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                     <div className="flex flex-wrap gap-2">
                       {customer.tags.length > 0 ? (
                         customer.tags.map((tag, index) => (
                           <span
                             key={index}
                             className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                           >
                             {tag}
                           </span>
                         ))
                       ) : (
                         <span className="text-sm text-gray-500">No tags assigned</span>
                       )}
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Customer Since Date</label>
                     <p className="text-sm text-gray-900">{customer.createdDate || 'Not provided'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Last Activity Date</label>
                     <p className="text-sm text-gray-900">{customer.lastActivity || 'Not provided'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                     <p className="text-sm text-gray-900">{formatDate(customer.createdAt)}</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Custom Fields Card */}
          {customFields.length > 0 && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="bg-gray-50 rounded-md px-3 py-2">
                        <p className="text-sm text-gray-900">
                          {formatCustomFieldValue(customer.customFields[field.name], field.type)}
                        </p>
                      </div>
                      {field.description && (
                        <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ownership History Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Ownership History</h2>
            </div>
            <div className="px-6 py-6">
              {customer.ownershipHistory.length > 0 ? (
                <div className="space-y-4">
                  {customer.ownershipHistory.map((record, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{record.owner}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{formatDate(record.timestamp)}</span>
                        </div>
                        {record.notes && (
                          <p className="mt-1 text-sm text-gray-600">{record.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No ownership history</h3>
                  <p className="mt-1 text-sm text-gray-500">No ownership records have been added yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
