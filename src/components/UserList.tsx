import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  UserPlus, 
  Search, 
  Mail, 
  Shield, 
  Building2, 
  MoreVertical,
  Edit2,
  Trash2,
  Key,
  X,
  Loader2,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function UserList() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    department: 'IT Department'
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    department: '',
    role: 'employee'
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: ''
  });

  const fetchUsers = () => {
    const channel = supabase.channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsersData();
      })
      .subscribe();

    fetchUsersData();
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUsersData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('displayName', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove their account permanently.')) return;
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      });
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsersData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.displayName || '',
      department: user.department || '',
      role: user.role || 'employee'
    });
    setIsEditModalOpen(true);
  };

  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setResetPasswordData({ newPassword: '' });
    setIsResetModalOpen(true);
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-neutral-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-sm text-neutral-500">Manage user accounts and permissions</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
        >
          <UserPlus size={16} />
          Add Team Member
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, or department..." 
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-neutral-300" />
          </div>
        ) : filteredUsers.map((user) => (
          <motion.div 
            key={user.id}
            layout
            className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-900 font-bold text-lg">
                {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(user)}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleResetPassword(user)}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                  title="Reset Password"
                >
                  <Key size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(user.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold tracking-tight mb-1">{user.displayName || 'Unnamed User'}</h3>
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-4">
              <Mail size={14} />
              <span className="truncate">{user.email}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 text-neutral-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Building2 size={10} />
                {user.department || 'IT Dept'}
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                user.role === 'admin' ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
              )}>
                <Shield size={10} />
                {user.role}
              </div>
              {user.needsPasswordChange && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <AlertCircle size={10} />
                  Reset Required
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Add Team Member</h3>
                  <p className="text-sm text-neutral-500">Create a new system account</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setError(null);
                try {
                  const response = await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                  });
                  
                  if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to create user');
                  }
                  
                  setIsModalOpen(false);
                  setFormData({ email: '', password: '', fullName: '', department: 'IT Department' });
                  fetchUsersData();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-8 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3">
                    <ShieldAlert size={18} />
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Full Name</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Email Address</label>
                  <input required type="email" className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Initial Password</label>
                  <input required type="password" title="Minimum 6 characters" className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Department / Division</label>
                  <select 
                    required 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all" 
                    value={formData.department} 
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="IT Support">IT Support</option>
                    <option value="System Admin">System Admin</option>
                    <option value="Network admin">Network admin</option>
                    <option value="Database Admin">Database Admin</option>
                    <option value="DB Network & System Admin Division">DB Network & System Admin Division</option>
                    <option value="IT Department">IT Department</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Create Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Edit Profile</h3>
                  <p className="text-sm text-neutral-500">Update user information</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setError(null);
                try {
                  const response = await fetch('/api/admin/update-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: selectedUser.id, ...editFormData })
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to update user' }));
                    throw new Error(errorData.error || 'Failed to update user');
                  }
                  
                  setIsEditModalOpen(false);
                  fetchUsersData();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-8 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3">
                    <ShieldAlert size={18} />
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Full Name</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={editFormData.fullName} onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Department / Division</label>
                  <select 
                    required 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all" 
                    value={editFormData.department} 
                    onChange={e => setEditFormData({ ...editFormData, department: e.target.value })}
                  >
                    <option value="IT Support">IT Support</option>
                    <option value="System Admin">System Admin</option>
                    <option value="Network admin">Network admin</option>
                    <option value="Database Admin">Database Admin</option>
                    <option value="DB Network & System Admin Division">DB Network & System Admin Division</option>
                    <option value="IT Department">IT Department</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">System Role</label>
                  <select className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all" value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Reset Password</h3>
                  <p className="text-sm text-neutral-500">Set a temporary password</p>
                </div>
                <button onClick={() => setIsResetModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setError(null);
                try {
                  const response = await fetch('/api/admin/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: selectedUser.id, ...resetPasswordData })
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to reset password' }));
                    throw new Error(errorData.error || 'Failed to reset password');
                  }
                  
                  setIsResetModalOpen(false);
                  alert('Password reset successfully. User will be prompted to change it at next login.');
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-8 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3">
                    <ShieldAlert size={18} />
                    {error}
                  </div>
                )}
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <AlertCircle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Resetting the password for <strong>{selectedUser?.displayName}</strong>. 
                    The user will be forced to change this password upon their next login.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">New Temporary Password</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={resetPasswordData.newPassword} onChange={e => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
