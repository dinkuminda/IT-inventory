import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, 
  Shield, 
  Mail, 
  Building2,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Plus,
  X,
  Loader2,
  Edit2,
  Trash2,
  Key,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserList() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    department: 'IT Department',
    password: 'Password123!'
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    department: '',
    role: ''
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: 'Password123!'
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
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
      fetchUsers();
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
    setResetPasswordData({ newPassword: 'Password123!' });
    setIsResetModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Team Members</h3>
            <p className="text-sm text-neutral-500">Manage IT staff and permissions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-50 rounded-full border border-neutral-100">
              <Users size={14} className="text-neutral-400" />
              <span className="text-xs font-bold text-neutral-600">{users.length} Total</span>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
              >
                <Plus size={18} />
                Add Employee
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
          {users.map((user) => (
            <div key={user.id} className="p-6 hover:bg-neutral-50 transition-colors group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-neutral-200">
                  {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    user.role === 'admin' ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                  )}>
                    {user.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                    {user.role}
                  </div>
                  {isAdmin && user.id !== currentUser?.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleResetPassword(user)}
                        className="p-1.5 hover:bg-white rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Reset Password"
                      >
                        <Key size={14} />
                      </button>
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-1.5 hover:bg-white rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h4 className="font-bold text-neutral-900 mb-1">{user.displayName || 'Anonymous User'}</h4>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Mail size={14} />
                  {user.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Building2 size={14} />
                  {user.department || 'IT Department'}
                </div>
              </div>

              {isAdmin && user.id === currentUser?.id && (
                <div className="w-full py-2 px-3 bg-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-center">
                  You (Current Session)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="text-xl font-bold tracking-tight">Add New Employee</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={20} />
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
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error || 'Failed to create user');
                  setIsModalOpen(false);
                  setFormData({ email: '', fullName: '', department: 'IT Department', password: 'Password123!' });
                  fetchUsers();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                    <ShieldAlert size={14} />
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
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Department</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Default Password</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="text-xl font-bold tracking-tight">Edit User</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={20} />
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
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error || 'Failed to update user');
                  setIsEditModalOpen(false);
                  fetchUsers();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                    <ShieldAlert size={14} />
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Full Name</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={editFormData.fullName} onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Department</label>
                  <input required className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={editFormData.department} onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Role</label>
                  <select className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="text-xl font-bold tracking-tight">Reset Password</h3>
                <button onClick={() => setIsResetModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={20} />
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
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error || 'Failed to reset password');
                  setIsResetModalOpen(false);
                  alert('Password reset successfully. User will be prompted to change it at next login.');
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setIsSubmitting(false);
                }
              }} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                    <ShieldAlert size={14} />
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
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

