'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Settings, Save, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { CustomFieldDefinition } from '@/types/customer';

export default function SettingsPage() {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const { getAuthToken } = useAuth();
  const { canBulkDelete } = useUserRole();

  useEffect(() => {
    fetchCustomFields();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This will remove it from all customers.')) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/custom-fields/${fieldId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCustomFields(customFields.filter(f => f.id !== fieldId));
      }
    } catch (error) {
      console.error('Error deleting custom field:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCustomFields.length) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedCustomFields.length} custom field${selectedCustomFields.length === 1 ? '' : 's'}? This will remove them from all customers.`;
    if (!confirm(confirmMessage)) return;

    setBulkDeleteLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/custom-fields/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customFieldIds: selectedCustomFields }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setCustomFields(customFields.filter(f => !selectedCustomFields.includes(f.id!)));
        setSelectedCustomFields([]);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error bulk deleting custom fields:', error);
      alert('Error deleting custom fields. Please try again.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleSelectCustomField = (fieldId: string) => {
    setSelectedCustomFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllCustomFields = () => {
    if (selectedCustomFields.length === customFields.length) {
      setSelectedCustomFields([]);
    } else {
      setSelectedCustomFields(customFields.map(f => f.id!).filter((id): id is string => id !== undefined));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Field
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Custom Fields
          </h2>
          <p className="text-gray-600 mt-1">
            Add custom fields to track specific information for your customers (e.g., equipment, service history, filter sizes).
          </p>
        </div>

        {/* Bulk Delete Controls */}
        {canBulkDelete && customFields.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCustomFields.length === customFields.length && customFields.length > 0}
                    onChange={handleSelectAllCustomFields}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Select All ({customFields.length})
                  </span>
                </label>
                {selectedCustomFields.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedCustomFields.length} field{selectedCustomFields.length === 1 ? '' : 's'} selected
                  </span>
                )}
              </div>
              {selectedCustomFields.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteLoading}
                  className="btn-danger flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {bulkDeleteLoading ? 'Deleting...' : `Delete Selected (${selectedCustomFields.length})`}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {canBulkDelete && (
                  <th className="table-header w-12">
                    <input
                      type="checkbox"
                      checked={selectedCustomFields.length === customFields.length && customFields.length > 0}
                      onChange={handleSelectAllCustomFields}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </th>
                )}
                <th className="table-header">Field Name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Required</th>
                <th className="table-header">Description</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customFields.map((field) => (
                <tr key={field.id} className="hover:bg-gray-50">
                  {canBulkDelete && field.id && (
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedCustomFields.includes(field.id)}
                        onChange={() => handleSelectCustomField(field.id!)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  <td className="table-cell font-medium">{field.name}</td>
                  <td className="table-cell">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {field.type}
                    </span>
                  </td>
                  <td className="table-cell">
                    {field.required ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                  <td className="table-cell max-w-xs truncate">{field.description}</td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingField(field)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => field.id && handleDelete(field.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customFields.length === 0 && (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No custom fields defined yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add Your First Custom Field
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Custom Field Modal */}
      {(showAddModal || editingField) && (
        <CustomFieldModal
          field={editingField}
          onClose={() => {
            setShowAddModal(false);
            setEditingField(null);
          }}
          onSave={async (fieldData) => {
            try {
              const token = await getAuthToken();
              const url = editingField 
                ? `/api/custom-fields/${editingField.id}`
                : '/api/custom-fields';
              const method = editingField ? 'PUT' : 'POST';

              const response = await fetch(url, {
                method,
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(fieldData),
              });

              if (response.ok) {
                await fetchCustomFields();
                setShowAddModal(false);
                setEditingField(null);
              }
            } catch (error) {
              console.error('Error saving custom field:', error);
            }
          }}
        />
      )}
    </div>
  );
}

// Custom Field Modal Component
function CustomFieldModal({ 
  field, 
  onClose, 
  onSave 
}: { 
  field: CustomFieldDefinition | null; 
  onClose: () => void; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    name: field?.name || '',
    type: field?.type || 'text',
    required: field?.required || false,
    options: field?.options?.join('\n') || '',
    defaultValue: field?.defaultValue || '',
    description: field?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      options: formData.type === 'select' ? formData.options.split('\n').filter(Boolean) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {field ? 'Edit Custom Field' : 'Add Custom Field'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Equipment Type, Filter Size"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="input-field"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select (Dropdown)</option>
                <option value="textarea">Text Area</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                placeholder="Brief description of this field"
              />
            </div>

            {formData.type === 'select' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options (one per line) *
                </label>
                <textarea
                  required
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Value
              </label>
              <input
                type={formData.type === 'number' ? 'number' : 'text'}
                value={formData.defaultValue}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                className="input-field"
                placeholder="Default value for this field"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
                Required field
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {field ? 'Update Field' : 'Add Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
