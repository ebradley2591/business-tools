'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { Shield, Plus, Copy, Trash2, Eye } from 'lucide-react';
import { ActivationCode, ActivationCodeUsage } from '@/types/activation';

export default function ActivationCodesPage() {
  const { getAuthToken } = useAuth();
  const { canManageUsers } = useUserRole();
  const [activationCodes, setActivationCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ActivationCode | null>(null);
  const [usageData, setUsageData] = useState<ActivationCodeUsage[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'early_adopter' as const,
    description: '',
    maxUses: '',
    expiresAt: ''
  });

  useEffect(() => {
    if (canManageUsers) {
      fetchActivationCodes();
    }
  }, [canManageUsers]);

  const fetchActivationCodes = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/activation-codes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const codes = await response.json();
        setActivationCodes(codes);
      } else {
        setError('Failed to fetch activation codes');
      }
    } catch (error) {
      console.error('Error fetching activation codes:', error);
      setError('Failed to fetch activation codes');
    } finally {
      setLoading(false);
    }
  };

  const createActivationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('/api/admin/activation-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          description: formData.description,
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
          expiresAt: formData.expiresAt || undefined,
        }),
      });

      if (response.ok) {
        const newCode = await response.json();
        setActivationCodes([newCode, ...activationCodes]);
        setShowCreateForm(false);
        setFormData({
          type: 'early_adopter',
          description: '',
          maxUses: '',
          expiresAt: ''
        });
      } else {
        setError('Failed to create activation code');
      }
    } catch (error) {
      console.error('Error creating activation code:', error);
      setError('Failed to create activation code');
    } finally {
      setLoading(false);
    }
  };

  const deactivateCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to deactivate this activation code?')) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/admin/activation-codes/${codeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setActivationCodes(codes => codes.map(code => 
          code.id === codeId ? { ...code, isActive: false } : code
        ));
      } else {
        setError('Failed to deactivate code');
      }
    } catch (error) {
      console.error('Error deactivating code:', error);
      setError('Failed to deactivate code');
    }
  };

  const fetchUsageData = async (codeId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/admin/activation-codes/${codeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const usage = await response.json();
        setUsageData(usage);
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access activation code management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activation Codes</h1>
          <p className="text-gray-600 mt-1">Manage activation codes for development and early adopters</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Code
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Activation Code</h2>
          <form onSubmit={createActivationCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-field"
                >
                  <option value="dev">Development</option>
                  <option value="early_adopter">Early Adopter</option>
                  <option value="contributor">Contributor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Uses (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                placeholder="e.g., Early adopter access for contributors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires At (leave empty for no expiration)
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Code'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Existing Codes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activationCodes.map((code) => (
                <tr key={code.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      code.type === 'dev' ? 'bg-purple-100 text-purple-800' :
                      code.type === 'early_adopter' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {code.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {code.currentUses}
                    {code.maxUses && ` / ${code.maxUses}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      code.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {code.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(code.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedCode(code);
                        fetchUsageData(code.id);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {code.isActive && (
                      <button
                        onClick={() => deactivateCode(code.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Modal */}
      {selectedCode && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Usage for Code: {selectedCode.code}
              </h3>
              {usageData.length > 0 ? (
                <div className="space-y-3">
                  {usageData.map((usage) => (
                    <div key={usage.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{usage.tenantName}</p>
                          <p className="text-sm text-gray-600">{usage.userEmail}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(usage.usedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No usage data available</p>
              )}
              <div className="mt-6">
                <button
                  onClick={() => setSelectedCode(null)}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
