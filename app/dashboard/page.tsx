'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { Customer, CustomFieldDefinition } from '@/types/customer';
import { Search, Plus, Edit, Trash2, Eye, Settings, Upload, Columns } from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
     const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
     name: true,
     phone: true,
     address: true,
     email: true,
     customerType: false,
     accountNumber: false,
     createdDate: false,
     lastActivity: false,
     tags: true,
     actions: true
   });

   // Update visible columns when custom fields change or customers data changes
   useEffect(() => {
     const newVisibleColumns: Record<string, boolean> = {
       name: true,
       phone: true,
       address: true,
       email: true,
       customerType: false,
       accountNumber: false,
       createdDate: false,
       lastActivity: false,
       tags: true,
       actions: true
     };

     // Add custom fields
     customFields.forEach(field => {
       newVisibleColumns[`custom_${field.id}`] = false; // Default to hidden
     });

     // Update based on actual data availability
     if (customers.length > 0) {
       // Check which standard fields have data
       const hasCustomerTypeData = customers.some(c => c.customerType && c.customerType.trim() !== '');
       const hasAccountNumberData = customers.some(c => c.accountNumber && c.accountNumber.trim() !== '');
       const hasCreatedDateData = customers.some(c => c.createdDate && c.createdDate.trim() !== '');
       const hasLastActivityData = customers.some(c => c.lastActivity && c.lastActivity.trim() !== '');

       // Show fields that have data by default
       if (hasCustomerTypeData) newVisibleColumns.customerType = true;
       if (hasAccountNumberData) newVisibleColumns.accountNumber = true;
       if (hasCreatedDateData) newVisibleColumns.createdDate = true;
       if (hasLastActivityData) newVisibleColumns.lastActivity = true;

       // Check which custom fields have data
       customFields.forEach(field => {
         const hasData = customers.some(c => c.customFields?.[field.name] && String(c.customFields[field.name]).trim() !== '');
         if (hasData) {
           newVisibleColumns[`custom_${field.id}`] = true;
         }
       });
     }

     setVisibleColumns(newVisibleColumns);
   }, [customFields, customers]);
  const { getAuthToken } = useAuth();
  const { canViewCustomers, canSearchCustomers, canManageSettings, canBulkDelete } = useUserRole();

  useEffect(() => {
    fetchCustomers();
    fetchCustomFields();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error('Error fetching customers:', response.status, response.statusText);
        // Don't clear existing customers on error, just log it
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Don't clear existing customers on error, just log it
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

  const handleDelete = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCustomers(customers.filter(c => c.id !== customerId));
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setBulkDeleteLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/customers/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerIds: selectedCustomers }),
      });

      if (response.ok) {
        setCustomers(customers.filter(c => c.id && !selectedCustomers.includes(c.id)));
        setSelectedCustomers([]);
        alert(`Successfully deleted ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''}.`);
      } else {
        const error = await response.json();
        alert(`Error deleting customers: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error bulk deleting customers:', error);
      alert('Error deleting customers. Please try again.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleSelectCustomer = (customerId: string | undefined, checked: boolean) => {
    if (!customerId) return;
    
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const handleSelectAllCustomers = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id).filter((id): id is string => id !== undefined));
    } else {
      setSelectedCustomers([]);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(customer.customFields || {}).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => customer.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(new Set(customers.flatMap(c => c.tags))).sort();



  if (!canViewCustomers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</div>
          <p className="text-gray-600">Your subscription is inactive. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Directory</h1>
          <p className="text-gray-600 mt-1">
            Manage and search your customer database
          </p>
        </div>
        <div className="flex items-center space-x-4">
                     {canManageSettings && (
             <Link
               href="/settings"
               className="text-gray-600 hover:text-gray-900 flex items-center"
             >
               <Settings className="h-4 w-4 mr-1" />
               Manage Custom Fields
             </Link>
           )}
          {canManageSettings && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </button>
              <Link
                href="/import"
                className="btn-secondary flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {canSearchCustomers && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customers
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, phone, address, email, or custom fields..."
                  className="input-field pl-10"
                />
              </div>
            </div>
                         <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Filter by Tags
               </label>
               <div className="flex flex-wrap gap-2">
                 <button
                   onClick={() => setSelectedTags([])}
                   className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                     selectedTags.length === 0
                       ? 'bg-primary-100 border-primary-300 text-primary-700'
                       : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                   }`}
                 >
                   All
                 </button>
                 {allTags.slice(0, 5).map(tag => (
                   <button
                     key={tag}
                     onClick={() => {
                       if (selectedTags.includes(tag)) {
                         setSelectedTags(selectedTags.filter(t => t !== tag));
                       } else {
                         setSelectedTags([...selectedTags, tag]);
                       }
                     }}
                     className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                       selectedTags.includes(tag)
                         ? 'bg-primary-100 border-primary-300 text-primary-700'
                         : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                     }`}
                   >
                     {tag}
                   </button>
                 ))}
                 {allTags.length > 5 && (
                   <span className="px-3 py-1 text-sm text-gray-500">
                     +{allTags.length - 5} more
                   </span>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}

             {/* Results Summary and Table Settings */}
       <div className="flex justify-between items-center">
         <div className="text-sm text-gray-600">
           Showing {filteredCustomers.length} of {customers.length} customers
         </div>
         <div className="flex items-center space-x-3">
           {selectedTags.length > 0 && (
             <button
               onClick={() => setSelectedTags([])}
               className="text-sm text-primary-600 hover:text-primary-700"
             >
               Clear filters
             </button>
           )}
           <button
             onClick={() => setShowTableSettings(true)}
             className="flex items-center text-sm text-gray-600 hover:text-gray-900"
           >
             <Columns className="h-4 w-4 mr-1" />
             Table Settings
           </button>
         </div>
       </div>

                           {/* Customers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Bulk Delete Controls */}
          {canBulkDelete && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={(e) => handleSelectAllCustomers(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Select All ({filteredCustomers.length})
                    </span>
                  </label>
                  {selectedCustomers.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                {selectedCustomers.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteLoading}
                    className="btn-danger flex items-center text-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {bulkDeleteLoading ? 'Deleting...' : `Delete ${selectedCustomers.length} Customer${selectedCustomers.length > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed" style={{ minWidth: '100%' }}>
              <thead className="bg-gray-50">
                <tr>
                  {canBulkDelete && <th className="table-header" style={{ width: '5%' }}></th>}
                  {visibleColumns.name && <th className="table-header" style={{ width: '15%' }}>Name</th>}
                  {visibleColumns.phone && <th className="table-header" style={{ width: '12%' }}>Phone</th>}
                  {visibleColumns.address && <th className="table-header" style={{ width: '20%' }}>Address</th>}
                  {visibleColumns.email && <th className="table-header" style={{ width: '15%' }}>Email</th>}
                  {visibleColumns.customerType && <th className="table-header" style={{ width: '10%' }}>Customer Type</th>}
                  {visibleColumns.accountNumber && <th className="table-header" style={{ width: '10%' }}>Account Number</th>}
                  {visibleColumns.createdDate && <th className="table-header" style={{ width: '10%' }}>Customer Since</th>}
                  {visibleColumns.lastActivity && <th className="table-header" style={{ width: '10%' }}>Last Activity</th>}
                  {visibleColumns.tags && <th className="table-header" style={{ width: '12%' }}>Tags</th>}
                  {/* Custom field columns */}
                  {customFields.map(field => 
                    visibleColumns[`custom_${field.id}`] && (
                      <th key={field.id} className="table-header" style={{ width: '10%' }}>
                        {field.name}
                      </th>
                    )
                  )}
                  <th className="table-header" style={{ width: '16%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    {canBulkDelete && (
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={customer.id ? selectedCustomers.includes(customer.id) : false}
                          onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="table-cell font-medium truncate" title={customer.name}>
                        {customer.name}
                      </td>
                    )}
                    {visibleColumns.phone && (
                      <td className="table-cell text-sm truncate" title={customer.phone}>
                        {customer.phone}
                      </td>
                    )}
                    {visibleColumns.address && (
                      <td className="table-cell text-sm truncate" title={customer.address}>
                        {customer.address}
                      </td>
                    )}
                    {visibleColumns.email && (
                      <td className="table-cell text-sm truncate" title={customer.email || '-'}>
                        {customer.email || '-'}
                      </td>
                    )}
                    {visibleColumns.customerType && (
                      <td className="table-cell text-sm truncate" title={customer.customerType || '-'}>
                        {customer.customerType || '-'}
                      </td>
                    )}
                    {visibleColumns.accountNumber && (
                      <td className="table-cell text-sm truncate" title={customer.accountNumber || '-'}>
                        {customer.accountNumber || '-'}
                      </td>
                    )}
                    {visibleColumns.createdDate && (
                      <td className="table-cell text-sm truncate" title={customer.createdDate || '-'}>
                        {customer.createdDate || '-'}
                      </td>
                    )}
                    {visibleColumns.lastActivity && (
                      <td className="table-cell text-sm truncate" title={customer.lastActivity || '-'}>
                        {customer.lastActivity || '-'}
                      </td>
                    )}
                    {visibleColumns.tags && (
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tag}
                            </span>
                          ))}
                          {customer.tags.length > 2 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{customer.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {/* Custom field values */}
                    {customFields.map(field => 
                      visibleColumns[`custom_${field.id}`] && (
                        <td key={field.id} className="table-cell text-sm truncate" title={String(customer.customFields?.[field.name] || '')}>
                          {customer.customFields?.[field.name] ? String(customer.customFields[field.name]) : '-'}
                        </td>
                      )
                    )}
                    <td className="table-cell">
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/dashboard/customer/${customer.id}`}
                          className="text-blue-600 hover:text-blue-900 flex items-center text-sm"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Link>
                        {canManageSettings && (
                          <>
                            <button
                              onClick={() => setEditingCustomer(customer)}
                              className="text-green-600 hover:text-green-900 flex items-center text-sm"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => customer.id && handleDelete(customer.id)}
                              className="text-red-600 hover:text-red-900 flex items-center text-sm"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {searchTerm || selectedTags.length > 0 ? (
                <div>
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-gray-500">No customers found matching your criteria.</p>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500 mb-4">No customers yet.</p>
                  {canManageSettings && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn-primary"
                    >
                      Add Your First Customer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {(showAddModal || editingCustomer) && (
        <CustomerModal
          customer={editingCustomer}
          customFields={customFields}
          onClose={() => {
            setShowAddModal(false);
            setEditingCustomer(null);
          }}
          onSave={async (customerData) => {
            try {
              const token = await getAuthToken();
              const url = editingCustomer 
                ? `/api/customers/${editingCustomer.id}`
                : '/api/customers';
              const method = editingCustomer ? 'PUT' : 'POST';

              const response = await fetch(url, {
                method,
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerData),
              });

              if (response.ok) {
                // Refresh the customers list
                await fetchCustomers();
                setShowAddModal(false);
                setEditingCustomer(null);
              } else {
                // Handle error response
                const errorData = await response.json();
                console.error('Error saving customer:', errorData);
                alert(`Failed to save customer: ${errorData.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.error('Error saving customer:', error);
              alert('Failed to save customer. Please try again.');
            }
          }}
        />
             )}

               {/* Table Settings Modal */}
        {showTableSettings && (
          <TableSettingsModal
            visibleColumns={visibleColumns}
            customFields={customFields}
            customers={customers}
            onClose={() => setShowTableSettings(false)}
            onSave={(newVisibleColumns) => {
              setVisibleColumns(newVisibleColumns);
              setShowTableSettings(false);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

       // Table Settings Modal Component
   function TableSettingsModal({ 
     visibleColumns,
     customFields,
     customers,
     onClose, 
     onSave 
   }: { 
     visibleColumns: Record<string, boolean>;
     customFields: CustomFieldDefinition[];
     customers: Customer[];
     onClose: () => void; 
     onSave: (visibleColumns: Record<string, boolean>) => void; 
   }) {
    const [localVisibleColumns, setLocalVisibleColumns] = useState(visibleColumns);
    const [showAllFields, setShowAllFields] = useState(false);

    // Analyze which fields actually have data
    const analyzeFieldUsage = () => {
      const fieldUsage: Record<string, { hasData: boolean; count: number; label: string }> = {};
      
      // Standard fields
      const standardFields = [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'address', label: 'Address' },
        { key: 'email', label: 'Email' },
        { key: 'customerType', label: 'Customer Type' },
        { key: 'accountNumber', label: 'Account Number' },
        { key: 'createdDate', label: 'Customer Since Date' },
        { key: 'lastActivity', label: 'Last Activity Date' },
        { key: 'tags', label: 'Tags' }
      ];

      standardFields.forEach(field => {
        const hasData = customers.some(customer => {
          const value = customer[field.key as keyof Customer];
          if (field.key === 'tags') {
            return Array.isArray(value) && value.length > 0;
          }
          return value && String(value).trim() !== '';
        });
        const count = customers.filter(customer => {
          const value = customer[field.key as keyof Customer];
          if (field.key === 'tags') {
            return Array.isArray(value) && value.length > 0;
          }
          return value && String(value).trim() !== '';
        }).length;
        
        fieldUsage[field.key] = { hasData, count, label: field.label };
      });

      // Custom fields
      customFields.forEach(field => {
        const hasData = customers.some(customer => {
          const value = customer.customFields?.[field.name];
          return value && String(value).trim() !== '';
        });
        const count = customers.filter(customer => {
          const value = customer.customFields?.[field.name];
          return value && String(value).trim() !== '';
        }).length;
        
        fieldUsage[`custom_${field.id}`] = { hasData, count, label: field.name };
      });

      return fieldUsage;
    };

    const fieldUsage = analyzeFieldUsage();

    // Get column options based on data availability
    const getColumnOptions = () => {
      const options: Array<{
        key: string;
        label: string;
        hasData: boolean;
        count: number;
        totalCount: number;
      }> = [];
      
      Object.entries(fieldUsage).forEach(([key, usage]) => {
        if (showAllFields || usage.hasData) {
          options.push({
            key,
            label: usage.label,
            hasData: usage.hasData,
            count: usage.count,
            totalCount: customers.length
          });
        }
      });

      return options.sort((a, b) => {
        // Sort by data availability first, then alphabetically
        if (a.hasData && !b.hasData) return -1;
        if (!a.hasData && b.hasData) return 1;
        return a.label.localeCompare(b.label);
      });
    };

    const columnOptions = getColumnOptions();

    const handleToggleColumn = (columnKey: string) => {
      // Prevent disabling the actions column
      if (columnKey === 'actions') return;
      
      setLocalVisibleColumns(prev => ({
        ...prev,
        [columnKey]: !prev[columnKey]
      }));
    };

    const handleSelectAll = () => {
      const allTrue = Object.fromEntries(
        Object.keys(localVisibleColumns).map(key => [key, true])
      );
      setLocalVisibleColumns(allTrue);
    };

    const handleSelectNone = () => {
      const allFalse = Object.fromEntries(
        Object.keys(localVisibleColumns).map(key => [key, false])
      );
      // Ensure actions is always visible
      allFalse.actions = true;
      setLocalVisibleColumns(allFalse);
    };

    const handleSelectFieldsWithData = () => {
      const fieldsWithData = Object.fromEntries(
        Object.keys(localVisibleColumns).map(key => [
          key, 
          key === 'actions' || fieldUsage[key]?.hasData || false
        ])
      );
      setLocalVisibleColumns(fieldsWithData);
    };

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-gray-900">
             Table Settings
           </h2>
           <button
             onClick={onClose}
             className="text-gray-400 hover:text-gray-600"
           >
             ✕
           </button>
         </div>

         <div className="space-y-4">
           {/* Show All Fields Toggle */}
           <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
             <div>
               <label className="flex items-center">
                 <input
                   type="checkbox"
                   checked={showAllFields}
                   onChange={(e) => setShowAllFields(e.target.checked)}
                   className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                 />
                 <span className="ml-3 text-sm font-medium text-gray-700">
                   Show All Fields
                 </span>
               </label>
               <p className="text-xs text-gray-500 mt-1 ml-7">
                 {showAllFields 
                   ? 'Displaying all available fields, including those without data'
                   : 'Only showing fields that contain data'
                 }
               </p>
             </div>
           </div>

           <div className="flex justify-between items-center">
             <h3 className="text-sm font-medium text-gray-700">Visible Columns</h3>
             <div className="flex space-x-2">
               <button
                 onClick={handleSelectFieldsWithData}
                 className="text-xs text-primary-600 hover:text-primary-700"
               >
                 Fields with Data
               </button>
               <button
                 onClick={handleSelectAll}
                 className="text-xs text-primary-600 hover:text-primary-700"
               >
                 Select All
               </button>
               <button
                 onClick={handleSelectNone}
                 className="text-xs text-gray-600 hover:text-gray-700"
               >
                 Select None
               </button>
             </div>
           </div>

           <div className="space-y-3">
             {columnOptions.map(option => (
               <label key={option.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                 <div className="flex items-center">
                   <input
                     type="checkbox"
                     checked={localVisibleColumns[option.key]}
                     onChange={() => handleToggleColumn(option.key)}
                     disabled={option.key === 'actions'}
                     className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                   />
                   <span className={`ml-3 text-sm ${option.key === 'actions' ? 'text-gray-500' : 'text-gray-700'}`}>
                     {option.label}
                     {option.key === 'actions' && ' (Always visible)'}
                   </span>
                 </div>
                 {option.key !== 'actions' && (
                   <div className="flex items-center space-x-2">
                     {option.hasData ? (
                       <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                         {option.count}/{option.totalCount}
                       </span>
                     ) : (
                       <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                         No data
                       </span>
                     )}
                   </div>
                 )}
               </label>
             ))}
           </div>

           {!showAllFields && Object.values(fieldUsage).some(f => !f.hasData) && (
             <div className="p-3 bg-blue-50 rounded-lg">
               <p className="text-sm text-blue-700">
                 <strong>Tip:</strong> Enable "Show All Fields" to see columns for fields that don't currently have data.
               </p>
             </div>
           )}
         </div>

         <div className="flex justify-end space-x-3 pt-6">
           <button
             type="button"
             onClick={onClose}
             className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
           >
             Cancel
           </button>
           <button
             onClick={() => onSave(localVisibleColumns)}
             className="btn-primary"
           >
             Save Settings
           </button>
         </div>
       </div>
     </div>
   );
 }

// Customer Modal Component (simplified for brevity)
 function CustomerModal({ 
  customer, 
  customFields,
  onClose, 
  onSave 
}: { 
  customer: Customer | null; 
  customFields: CustomFieldDefinition[];
  onClose: () => void; 
  onSave: (data: any) => void; 
}) {
  // Helper function to format dates for input fields
  const formatDateForInput = (dateValue: string | Date): string => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };
     const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    email: customer?.email || '',
    secondaryContactName: customer?.secondaryContactName || '',
    secondaryContactPhone: customer?.secondaryContactPhone || '',
    customerType: customer?.customerType || '',
    accountNumber: customer?.accountNumber || '',
    createdDate: customer?.createdDate ? formatDateForInput(customer.createdDate) : '',
    lastActivity: customer?.lastActivity ? formatDateForInput(customer.lastActivity) : '',
    tags: customer?.tags || [],
    customFields: customer?.customFields || {},
    ownershipHistory: customer?.ownershipHistory || [],
  });
   
     const [tagsInput, setTagsInput] = useState(customer?.tags?.join(', ') || '');
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [editingOwnershipIndex, setEditingOwnershipIndex] = useState<number | null>(null);
  const [ownershipForm, setOwnershipForm] = useState({
    owner: '',
    notes: '',
    timestamp: new Date().toISOString().split('T')[0],
  });

  // Update form data when customer prop changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        email: customer.email || '',
        secondaryContactName: customer.secondaryContactName || '',
        secondaryContactPhone: customer.secondaryContactPhone || '',
        customerType: customer.customerType || '',
        accountNumber: customer.accountNumber || '',
        createdDate: customer.createdDate ? formatDateForInput(customer.createdDate) : '',
        lastActivity: customer.lastActivity ? formatDateForInput(customer.lastActivity) : '',
        tags: customer.tags || [],
        customFields: customer.customFields || {},
        ownershipHistory: customer.ownershipHistory || [],
      });
      setTagsInput(customer.tags?.join(', ') || '');
    }
  }, [customer]);

   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     // Process tags input before saving
     const processedTags = tagsInput
       .split(',')
       .map(tag => tag.trim())
       .filter(Boolean);
     
     onSave({
       ...formData,
       tags: processedTags
     });
   };

   const handleAddOwnership = () => {
     setEditingOwnershipIndex(null);
     setOwnershipForm({
       owner: '',
       notes: '',
       timestamp: new Date().toISOString().split('T')[0],
     });
     setShowOwnershipModal(true);
   };

   const handleEditOwnership = (index: number) => {
     const record = formData.ownershipHistory[index];
     setEditingOwnershipIndex(index);
     setOwnershipForm({
       owner: record.owner,
       notes: record.notes || '',
       timestamp: record.timestamp ? new Date(record.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
     });
     setShowOwnershipModal(true);
   };

   const handleSaveOwnership = () => {
     if (!ownershipForm.owner.trim()) return;

           const newRecord = {
        name: ownershipForm.owner.trim(), // Use owner name as the name field
        owner: ownershipForm.owner.trim(),
        notes: ownershipForm.notes.trim(),
        timestamp: new Date(ownershipForm.timestamp),
      };

     if (editingOwnershipIndex !== null) {
       // Edit existing record
       const updatedHistory = [...formData.ownershipHistory];
       updatedHistory[editingOwnershipIndex] = newRecord;
       setFormData({ ...formData, ownershipHistory: updatedHistory });
     } else {
       // Add new record
       setFormData({ 
         ...formData, 
         ownershipHistory: [...formData.ownershipHistory, newRecord] 
       });
     }

     setShowOwnershipModal(false);
   };

   const handleDeleteOwnership = (index: number) => {
     if (confirm('Are you sure you want to delete this ownership record?')) {
       const updatedHistory = formData.ownershipHistory.filter((_, i) => i !== index);
       setFormData({ ...formData, ownershipHistory: updatedHistory });
     }
   };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {customer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Contact Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.secondaryContactName}
                      onChange={(e) => setFormData({ ...formData, secondaryContactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter secondary contact name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.secondaryContactPhone}
                      onChange={(e) => setFormData({ ...formData, secondaryContactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter secondary contact phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Type
                    </label>
                    <input
                      type="text"
                      value={formData.customerType}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Residential, Commercial, Industrial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter account number"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter full address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Since Date
                    </label>
                    <input
                      type="date"
                      value={formData.createdDate}
                      onChange={(e) => setFormData({ ...formData, createdDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Activity Date
                    </label>
                    <input
                      type="date"
                      value={formData.lastActivity}
                      onChange={(e) => setFormData({ ...formData, lastActivity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="premium, active, vip"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership History Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Ownership History</h3>
                <button
                  type="button"
                  onClick={handleAddOwnership}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Add Owner
                </button>
              </div>
              
              {formData.ownershipHistory.length > 0 ? (
                <div className="space-y-3">
                  {formData.ownershipHistory.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{record.name || record.owner}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">
                            {record.timestamp ? new Date(record.timestamp).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                        {record.notes && (
                          <p className="mt-1 text-sm text-gray-600">{record.notes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditOwnership(index)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwnership(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No ownership history recorded yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add Owner" to start tracking ownership changes.</p>
                </div>
              )}
            </div>

            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customFields.map(field => (
                    <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.name} {field.required && '*'}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          required={field.required}
                          value={formData.customFields[field.name] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [field.name]: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          rows={3}
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={formData.customFields[field.name] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [field.name]: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select {field.name}</option>
                          {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.customFields[field.name] || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              customFields: {
                                ...formData.customFields,
                                [field.name]: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Yes</span>
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          required={field.required}
                          value={formData.customFields[field.name] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [field.name]: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {customer ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Ownership Modal */}
      {showOwnershipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingOwnershipIndex !== null ? 'Edit Owner' : 'Add Owner'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownershipForm.owner}
                  onChange={(e) => setOwnershipForm({ ...ownershipForm, owner: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={ownershipForm.timestamp}
                  onChange={(e) => setOwnershipForm({ ...ownershipForm, timestamp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={ownershipForm.notes}
                  onChange={(e) => setOwnershipForm({ ...ownershipForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Optional notes about this ownership period"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowOwnershipModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOwnership}
                disabled={!ownershipForm.owner.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingOwnershipIndex !== null ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
