import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, 
  Search, 
  Key, 
  Download, 
  Upload, 
  Edit2, 
  Trash2, 
  AlertCircle,
  X,
  Loader2,
  ShieldAlert,
  Calendar,
  Building2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import Papa from 'papaparse';

export default function LicenseList() {
  const { isAdmin } = useAuth();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    key: '',
    seats: 1,
    usedSeats: 0,
    expiryDate: '',
    department: 'IT Department',
    notes: ''
  });

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
    
    const channel = supabase.channel('licenses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'licenses' }, fetchLicenses)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const { data } = results;
        const licensesToInsert = (data as any[]).filter(item => item.name && item.vendor).map(item => ({
          name: item.name,
          vendor: item.vendor,
          key: item.key || '',
          seats: parseInt(item.seats) || 1,
          usedSeats: parseInt(item.usedSeats) || 0,
          expiryDate: item.expiryDate || null,
          department: item.department || 'IT Department',
          notes: item.notes || ''
        }));

        if (licensesToInsert.length > 0) {
          try {
            const response = await fetch('/api/licenses/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payload: licensesToInsert })
            });
            if (!response.ok) throw new Error('Failed to import licenses');
            fetchLicenses();
            alert(`Successfully imported ${licensesToInsert.length} licenses.`);
          } catch (error: any) {
            alert(error.message);
          }
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/licenses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          licenseId: editingLicense?.id,
          payload: formData 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save license' }));
        throw new Error(errorData.error || 'Failed to save license');
      }
      
      setIsModalOpen(false);
      setEditingLicense(null);
      setFormData({
        name: '', vendor: '', key: '', seats: 1, usedSeats: 0,
        expiryDate: '', department: 'IT Department', notes: ''
      });
      fetchLicenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this license?')) return;
    try {
      const response = await fetch('/api/licenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!response.ok) throw new Error('Failed to delete license');
      fetchLicenses();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredLicenses = licenses.filter(license => 
    license.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Software Licenses</h1>
          <p className="text-sm text-neutral-500">Manage keys and seat allocations</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all cursor-pointer">
            <Upload size={16} />
            Import
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={() => { setEditingLicense(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
          >
            <Plus size={16} />
            Add License
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input 
            type="text" 
            placeholder="Search licenses or vendors..." 
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
        ) : filteredLicenses.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-neutral-200">
            <Key className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium">No licenses found.</p>
          </div>
        ) : filteredLicenses.map((license) => (
          <motion.div 
            key={license.id}
            layout
            className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-900 text-white rounded-2xl">
                <Key size={24} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingLicense(license);
                    setFormData({
                      name: license.name,
                      vendor: license.vendor,
                      key: license.key,
                      seats: license.seats,
                      usedSeats: license.usedSeats,
                      expiryDate: license.expiryDate || '',
                      department: license.department,
                      notes: license.notes || ''
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(license.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold tracking-tight mb-1">{license.name}</h3>
            <p className="text-sm text-neutral-500 mb-4">{license.vendor}</p>

            <div className="space-y-3 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Users size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Allocation</span>
                </div>
                <span className="text-sm font-bold">
                  {license.usedSeats} / {license.seats}
                </span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    (license.usedSeats / license.seats) > 0.9 ? "bg-red-500" : "bg-neutral-900"
                  )}
                  style={{ width: `${Math.min(100, (license.usedSeats / license.seats) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Calendar size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Expiry</span>
                </div>
                <span className={cn(
                  "text-xs font-bold",
                  license.expiryDate && new Date(license.expiryDate) < new Date() ? "text-red-600" : "text-neutral-700"
                )}>
                  {license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : 'Perpetual'}
                </span>
              </div>
            </div>

            {license.key && (
              <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">License Key</p>
                <p className="text-xs font-mono break-all text-neutral-600">{license.key}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{editingLicense ? 'Edit License' : 'Add New License'}</h3>
                  <p className="text-sm text-neutral-500">Enter software details below</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3">
                    <ShieldAlert size={18} />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Software Name</label>
                    <input 
                      required 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Vendor</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.vendor}
                      onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">License Key</label>
                    <input 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono"
                      value={formData.key}
                      onChange={e => setFormData({ ...formData, key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Total Seats</label>
                    <input 
                      type="number"
                      required
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.seats}
                      onChange={e => setFormData({ ...formData, seats: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Used Seats</label>
                    <input 
                      type="number"
                      required
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.usedSeats}
                      onChange={e => setFormData({ ...formData, usedSeats: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Expiry Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.expiryDate}
                      onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Department</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingLicense ? 'Update License' : 'Create License')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
