import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  QrCode,
  X,
  Loader2,
  ShieldAlert,
  ClipboardList,
  Laptop,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Papa from 'papaparse';
import { QRCodeSVG } from 'qrcode.react';

export default function AssetList() {
  const { isAdmin, profile } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<any>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Laptop',
    serialNumber: '',
    status: 'In Stock',
    assignedTo: '',
    roles: 'IT Support',
    location: '',
    date: new Date().toISOString().split('T')[0],
    remark: '',
    notes: ''
  });

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('updatedAt', { ascending: false });
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    
    const channel = supabase.channel('assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, fetchAssets)
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
        const assetsToInsert = [];
        let count = 0;

        for (const item of data as any[]) {
          if (item.name && item.type && item.status) {
            assetsToInsert.push({
              name: item.name,
              type: item.type,
              serialNumber: item.serialNumber || '',
              status: item.status,
              assignedTo: isAdmin ? (item.assignedTo || '') : (profile?.email || ''),
              roles: item.roles || 'IT Support',
              location: item.location || '',
              date: item.date || new Date().toISOString().split('T')[0],
              remark: item.remark || '',
              notes: item.notes || '',
              approvalStatus: isAdmin ? (item.approvalStatus || 'Approved') : 'Pending',
              updatedAt: new Date().toISOString()
            });
          }
        }

        if (assetsToInsert.length > 0) {
          try {
            const response = await fetch('/api/assets/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payload: assetsToInsert })
            });
            
            if (!response.ok) throw new Error('Failed to import assets');
            
            count = assetsToInsert.length;
            fetchAssets();
            alert(`Successfully imported ${count} assets.`);
          } catch (error: any) {
            console.error('Error importing assets:', error);
            alert(error.message);
          }
        }
      }
    });
  };

  const handleExport = () => {
    const csv = Papa.unparse(assets);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      approvalStatus: isAdmin ? 'Approved' : 'Pending',
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/assets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assetId: editingAsset?.id,
          payload: editingAsset ? { ...formData, updatedAt: new Date().toISOString() } : payload 
        })
      });

      if (!response.ok) throw new Error('Failed to save asset');
      
      setIsModalOpen(false);
      setEditingAsset(null);
      setFormData({
        name: '', type: 'Laptop', serialNumber: '', status: 'In Stock',
        assignedTo: '', roles: 'IT Support', location: '',
        date: new Date().toISOString().split('T')[0], remark: '', notes: ''
      });
      fetchAssets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      const response = await fetch('/api/assets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!response.ok) throw new Error('Failed to delete asset');
      fetchAssets();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || asset.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IT Assets</h1>
          <p className="text-sm text-neutral-500">Manage and track hardware inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all"
          >
            <Download size={16} />
            Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all cursor-pointer">
            <Upload size={16} />
            Import
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
          >
            <Plus size={16} />
            Add Asset
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, serial, or user..." 
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-neutral-400" size={18} />
          <select 
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Laptop">Laptops</option>
            <option value="Desktop">Desktops</option>
            <option value="Monitor">Monitors</option>
            <option value="Mobile">Mobile Devices</option>
            <option value="Network Device">Network Devices</option>
            <option value="Peripheral">Peripherals</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Asset Info</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Assignment</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Approval</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-300" />
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500">
                        <Laptop size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{asset.name}</p>
                        <p className="text-xs text-neutral-500 font-mono">{asset.serialNumber || 'No Serial'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      asset.status === 'In Stock' ? "bg-green-50 text-green-700" :
                      asset.status === 'Assigned' ? "bg-blue-50 text-blue-700" :
                      asset.status === 'Maintenance' ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    )}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {asset.assignedTo ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-700">{asset.assignedTo}</span>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold">{asset.roles}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider",
                        asset.approvalStatus === 'Approved' ? "text-green-600" :
                        asset.approvalStatus === 'Rejected' ? "text-red-600" :
                        "text-amber-600"
                      )}>
                        {asset.approvalStatus === 'Approved' && <CheckCircle size={10} />}
                        {asset.approvalStatus === 'Rejected' && <XCircle size={10} />}
                        {asset.approvalStatus === 'Pending' && <Clock size={10} />}
                        {asset.approvalStatus}
                      </span>
                      {asset.remark && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                          <ClipboardList size={10} />
                          <span className="truncate max-w-[150px]">{asset.remark}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && asset.approvalStatus === 'Pending' && (
                        <>
                           <button 
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/assets/update', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    id: asset.id, 
                                    updates: { approvalStatus: 'Approved', updatedAt: new Date().toISOString() } 
                                  })
                                });
                                if (!response.ok) throw new Error('Failed to approve asset');
                                fetchAssets();
                              } catch (error: any) {
                                alert(error.message);
                              }
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                            title="Approve Asset"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/assets/update', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    id: asset.id, 
                                    updates: { approvalStatus: 'Rejected', updatedAt: new Date().toISOString() } 
                                  })
                                });
                                if (!response.ok) throw new Error('Failed to reject asset');
                                fetchAssets();
                              } catch (error: any) {
                                alert(error.message);
                              }
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                            title="Reject Asset"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => { setQrAsset(asset); setIsQrModalOpen(true); }}
                        className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Generate QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                      {(isAdmin || asset.assignedTo === profile?.email) && (
                        <button 
                          onClick={() => { setEditingAsset(asset); setIsModalOpen(true); }}
                          className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {isQrModalOpen && qrAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Asset QR Code</h3>
                <button onClick={() => setIsQrModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-neutral-50 p-8 rounded-3xl inline-block mb-6 border border-neutral-100">
                <QRCodeSVG value={JSON.stringify({ id: qrAsset.id, sn: qrAsset.serialNumber })} size={200} />
              </div>
              <div className="space-y-1 mb-6">
                <p className="font-bold text-lg">{qrAsset.name}</p>
                <p className="text-sm text-neutral-500 font-mono">{qrAsset.serialNumber}</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all"
              >
                Print Label
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <h3 className="text-2xl font-bold tracking-tight">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
                  <p className="text-sm text-neutral-500">Enter hardware details below</p>
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
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Asset Name</label>
                    <input 
                      required 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Serial Number</label>
                    <input 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono"
                      value={formData.serialNumber}
                      onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Asset Type</label>
                    <select 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Mobile">Mobile Device</option>
                      <option value="Network Device">Network Device</option>
                      <option value="Peripheral">Peripheral</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Status</label>
                    <select 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Assigned To (Email)</label>
                    <input 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.assignedTo}
                      onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Location</label>
                    <input 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Remarks / Justification</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all resize-none"
                    value={formData.remark}
                    onChange={e => setFormData({ ...formData, remark: e.target.value })}
                    placeholder="Why is this asset being added/assigned?"
                  />
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
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (editingAsset ? 'Update Asset' : 'Create Asset')}
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
