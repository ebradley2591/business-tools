'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { Plus, Edit, Trash2, User, Shield, Mail, AlertTriangle, Copy } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface TenantUser {
  uid: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt?: Date;
  status: 'active' | 'invited' | 'suspended';
}

interface UserInvite {
  id: string;
  email: string;
  role: 'admin' | 'user';
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export default function UsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState({
    maxUsers: 5,
    currentUsers: 0,
    plan: 'free'
  });
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  
  const { getAuthToken } = useAuth();
  const { canManageUsers } = useUserRole();

  useEffect(() => {
    fetchUsers();
    fetchInvites();
    fetchLicenseInfo();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setUserProfile(data.userProfile);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchInvites = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/users/invites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenseInfo = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/users/license-info', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLicenseInfo(data);
      }
    } catch (error) {
      console.error('Error fetching license info:', error);
    }
  };

  const handleInviteUser = async (inviteData: { email: string; role: 'admin' | 'user' }) => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData),
      });

      if (response.ok) {
        await fetchInvites();
        setShowInviteModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to invite user');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Error inviting user');
    }
  };

  const handleUpdateUserRole = async (uid: string, role: 'admin' | 'user') => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        await fetchUsers();
        setEditingUser(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role');
    }
  };

  const handleRemoveUser = async (uid: string) => {
    if (!confirm('Are you sure you want to remove this user? They will lose access to the system.')) {
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/users/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Error removing user');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/users/invites/${inviteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchInvites();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel invite');
      }
    } catch (error) {
      console.error('Error canceling invite:', error);
      alert('Error canceling invite');
    }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only administrators can manage users.</p>
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

  const canInviteMore = licenseInfo.currentUsers < licenseInfo.maxUsers;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users and permissions for your organization</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={!canInviteMore}
          className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </button>
      </div>

      {/* License Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">License Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{licenseInfo.currentUsers}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{licenseInfo.maxUsers}</div>
            <div className="text-sm text-gray-600">User Limit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{licenseInfo.plan}</div>
            <div className="text-sm text-gray-600">Current Plan</div>
          </div>
        </div>
        {!canInviteMore && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>User limit reached:</strong> You've reached your maximum number of users. 
              Upgrade your plan to add more users.
            </p>
          </div>
        )}
      </div>

      {/* Active Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Active Users</h2>
          <p className="text-gray-600 mt-1">Users with access to your organization</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">User</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Login</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      {user.uid !== userProfile?.uid && (
                        <>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-600 hover:text-blue-900 flex items-center text-sm"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.uid)}
                            className="text-red-600 hover:text-red-900 flex items-center text-sm"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </button>
                        </>
                      )}
                      {user.uid === userProfile?.uid && (
                        <span className="text-sm text-gray-500">(You)</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending Invites</h2>
            <p className="text-gray-600 mt-1">Users who have been invited but haven't joined yet. Copy and share the invitation links manually.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Invited</th>
                  <th className="table-header">Invitation Link</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{invite.email}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        invite.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {invite.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        invite.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invite.status}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.id}`}
                          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => {
                            const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.id}`;
                            navigator.clipboard.writeText(link);
                            setCopiedInviteId(invite.id);
                            setTimeout(() => setCopiedInviteId(null), 2000);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                          title="Copy link"
                        >
                          {copiedInviteId === invite.id ? (
                            <span className="text-green-600 text-xs">✓</span>
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-red-600 hover:text-red-900 flex items-center text-sm"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteUser}
        />
      )}

      {/* Edit User Role Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={handleUpdateUserRole}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}

// Invite User Modal Component
function InviteUserModal({ 
  onClose, 
  onInvite 
}: { 
  onClose: () => void; 
  onInvite: (data: { email: string; role: 'admin' | 'user' }) => void; 
}) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'user' as 'admin' | 'user'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invite User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              placeholder="user@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
              className="input-field"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
              className="btn-primary"
            >
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ 
  user, 
  onClose, 
  onUpdate 
}: { 
  user: TenantUser; 
  onClose: () => void; 
  onUpdate: (uid: string, role: 'admin' | 'user') => void; 
}) {
  const [role, setRole] = useState(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(user.uid, role);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Editing user: {user.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              className="input-field"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
              className="btn-primary"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
