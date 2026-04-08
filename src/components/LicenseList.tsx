import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';
import { 
  Plus, 
  Search, 
  Key, 
  Edit2, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Download,
  Upload
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function LicenseList() {
  const { isAdmin } = useAuth();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('updatedAt', { ascending: false });
      
      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    }
  };

  useEffect(() => {
    fetchLicenses();
    const interval = setInterval(fetchLicenses, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLicenses = licenses.filter(license => 
    license.softwareName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this license?')) return;
    try {
      const response = await fetch('/api/licenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        if (!response.ok) throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) throw new Error(result.error || 'Failed to delete license');
      fetchLicenses();
    } catch (error: any) {
      console.error('Error deleting license:', error);
      alert(error.message);
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(licenses.map(({ id, updatedAt, ...rest }) => ({
      ...rest,
      updatedAt: formatDate(updatedAt)
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `licenses_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let count = 0;
        const licensesToInsert = [];
        
        for (const item of data) {
          if (item.softwareName && item.totalSeats) {
            licensesToInsert.push({
              softwareName: item.softwareName,
              key: item.key || '',
              totalSeats: Number(item.totalSeats) || 1,
              usedSeats: Number(item.usedSeats) || 0,
              status: item.status || 'Active',
              expiryDate: item.expiryDate || '',
              updatedAt: new Date().toISOString()
            });
          }
        }

        if (licensesToInsert.length > 0) {
          try {
            const response = await fetch('/api/licenses/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payload: licensesToInsert })
            });
            
            const text = await response.text();
            let result;
            try {
              result = JSON.parse(text);
            } catch (e) {
              if (!response.ok) throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
              throw new Error('Invalid response from server');
            }
            
            if (!response.ok) throw new Error(result.error || 'Failed to import licenses');
            
            count = licensesToInsert.length;
            fetchLicenses();
          } catch (error: any) {
            console.error('Error importing licenses:', error);
            alert(error.message);
          }
        }

        alert(`Successfully imported ${count} licenses.`);
        e.target.value = '';
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search software licenses..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            id="license-csv-import"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <button 
            onClick={() => document.getElementById('license-csv-import')?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Upload size={18} />
            Import
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Download size={18} />
            Export
          </button>
          <button 
            onClick={() => { setEditingLicense(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
          >
            <Plus size={18} />
            Add License
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLicenses.map((license) => (
          <motion.div 
            key={license.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-100 rounded-2xl text-neutral-900 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                <Key size={24} />
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { setEditingLicense(license); setIsModalOpen(true); }}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(license.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold tracking-tight mb-1">{license.softwareName}</h3>
            <p className="text-xs text-neutral-400 font-mono mb-6 truncate">{license.key || 'No License Key'}</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 font-medium">Seats Usage</span>
                <span className="font-bold">{license.usedSeats} / {license.totalSeats}</span>
              </div>
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    (license.usedSeats / license.totalSeats) > 0.9 ? "bg-red-500" : "bg-neutral-900"
                  )}
                  style={{ width: `${Math.min((license.usedSeats / license.totalSeats) * 100, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {license.status === 'Active' ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <AlertCircle size={14} className="text-amber-500" />
                  )}
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    license.status === 'Active' ? "text-green-700" : "text-amber-700"
                  )}>
                    {license.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <Clock size={12} />
                  Exp: {formatDate(license.expiryDate)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <LicenseModal 
          license={editingLicense} 
          onClose={() => {
            setIsModalOpen(false);
            fetchLicenses();
          }} 
        />
      )}
    </div>
  );
}

function LicenseModal({ license, onClose }: { license?: any, onClose: () => void }) {
  const [formData, setFormData] = useState({
    softwareName: license?.softwareName || '',
    key: license?.key || '',
    totalSeats: license?.totalSeats || 1,
    usedSeats: license?.usedSeats || 0,
    status: license?.status || 'Active',
    expiryDate: license?.expiryDate ? new Date(license.expiryDate).toISOString().split('T')[0] : ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        totalSeats: Number(formData.totalSeats),
        usedSeats: Number(formData.usedSeats),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch('/api/licenses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId: license?.id,
          payload
        })
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        if (!response.ok) throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) throw new Error(result.error || 'Failed to save license');

      onClose();
    } catch (error: any) {
      console.error('Error saving license:', error);
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">{license ? 'Edit License' : 'Add New License'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Software Name</label>
            <input
              required
              className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
              value={formData.softwareName}
              onChange={e => setFormData({ ...formData, softwareName: e.target.value })}
              placeholder="e.g. Adobe Creative Cloud"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">License Key</label>
            <input
              className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all font-mono"
              value={formData.key}
              onChange={e => setFormData({ ...formData, key: e.target.value })}
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Total Seats</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.totalSeats}
                onChange={e => setFormData({ ...formData, totalSeats: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Used Seats</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.usedSeats}
                onChange={e => setFormData({ ...formData, usedSeats: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Status</label>
              <select
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option>Active</option>
                <option>Expired</option>
                <option>Suspended</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Expiry Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.expiryDate}
                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
            >
              {license ? 'Save Changes' : 'Add License'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
