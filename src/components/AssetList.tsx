import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Laptop,
  Monitor,
  Smartphone,
  Cpu,
  MoreHorizontal,
  Package,
  LucideX,
  Download,
  Upload,
  Network,
  ClipboardList,
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function AssetList() {
  const { isAdmin, profile } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mine'>(isAdmin ? 'all' : 'mine');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [qrAsset, setQrAsset] = useState<any>(null);

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
    }
  };

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || asset.assignedTo === profile?.email;
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      const response = await fetch('/api/assets/delete', {
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
      
      if (!response.ok) throw new Error(result.error || 'Failed to delete asset');
      fetchAssets();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      alert(error.message);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Laptop': return Laptop;
      case 'Monitor': return Monitor;
      case 'Mobile': return Smartphone;
      case 'Network Device': return Network;
      default: return Cpu;
    }
  };

  const handleExport = () => {
    const dataToExport = isAdmin ? assets : assets.filter(a => a.assignedTo === profile?.email);
    const csv = Papa.unparse(dataToExport.map(({ id, updatedAt, ...rest }) => ({
      ...rest,
      updatedAt: formatDate(updatedAt)
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${isAdmin ? 'all' : 'my'}_assets_inventory_${new Date().toISOString().split('T')[0]}.csv`);
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
        const assetsToInsert = [];
        
        for (const item of data) {
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
            
            const text = await response.text();
            let result;
            try {
              result = JSON.parse(text);
            } catch (e) {
              if (!response.ok) throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
              throw new Error('Invalid response from server');
            }
            
            if (!response.ok) throw new Error(result.error || 'Failed to import assets');
            
            count = assetsToInsert.length;
            fetchAssets();
          } catch (error: any) {
            console.error('Error importing assets:', error);
            alert(error.message);
          }
        }

        if (count > 0) {
          alert(`Successfully imported ${count} assets.`);
        } else if (assetsToInsert.length === 0) {
          alert('No valid assets found in CSV. Please ensure "name", "type", and "status" columns are present.');
        }
        e.target.value = '';
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('Error parsing CSV file.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        id="csv-import"
        accept=".csv"
        className="hidden"
        onChange={handleImport}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search assets by name, serial, or type..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex bg-white border border-neutral-200 rounded-xl p-1 mr-2">
              <button 
                onClick={() => setFilterType('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filterType === 'all' ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('mine')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filterType === 'mine' ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                My Assets
              </button>
            </div>
          )}
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Download size={18} />
            Export
          </button>
          <button 
            onClick={() => document.getElementById('csv-import')?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors"
          >
            <Upload size={18} />
            Import
          </button>
          <button 
            onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
          >
            <Plus size={18} />
            Add Asset
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Asset</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hidden md:table-cell">Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hidden lg:table-cell">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hidden xl:table-cell">Location</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hidden xl:table-cell">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hidden sm:table-cell">Approval</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hidden md:table-cell">Assignment</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredAssets.map((asset) => {
                const Icon = getIcon(asset.type);
                return (
                  <tr key={asset.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600 group-hover:bg-white transition-colors hidden sm:flex">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{asset.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{asset.serialNumber || 'No Serial'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-medium text-neutral-600">{asset.type}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm font-medium text-neutral-600">{asset.roles || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        asset.status === 'In Use' ? "bg-green-50 text-green-700 border border-green-100" :
                        asset.status === 'In Stock' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        asset.status === 'Under Repair' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        asset.status === 'Retired' ? "bg-red-50 text-red-700 border border-red-100" :
                        "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      )}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden xl:table-cell">
                      <span className="text-sm font-medium text-neutral-600">{asset.location || '-'}</span>
                    </td>
                    <td className="px-6 py-4 hidden xl:table-cell">
                      <span className="text-sm font-medium text-neutral-600">{asset.date || '-'}</span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                        asset.approvalStatus === 'Approved' ? "bg-green-50 text-green-700 border border-green-100" :
                        asset.approvalStatus === 'Rejected' ? "bg-red-50 text-red-700 border border-red-100" :
                        "bg-amber-50 text-amber-700 border border-amber-100"
                      )}>
                        {asset.approvalStatus === 'Approved' && <CheckCircle size={12} />}
                        {asset.approvalStatus === 'Rejected' && <XCircle size={12} />}
                        {asset.approvalStatus === 'Pending' && <Clock size={12} />}
                        {asset.approvalStatus || 'Pending'}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            asset.assignedTo ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
                          )}>
                            {asset.assignedTo ? asset.assignedTo.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-xs font-bold uppercase tracking-tighter",
                              asset.assignedTo ? "text-neutral-900" : "text-neutral-400"
                            )}>
                              {asset.assignedTo ? 'Assigned' : 'Unassigned'}
                            </span>
                            {asset.assignedTo && (
                              <span className="text-[10px] text-neutral-500 truncate max-w-[100px]">
                                {asset.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
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
                                  
                                  const text = await response.text();
                                  let result;
                                  try {
                                    result = JSON.parse(text);
                                  } catch (e) {
                                    if (!response.ok) throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
                                    throw new Error('Invalid response from server');
                                  }
                                  
                                  if (!response.ok) throw new Error(result.error || 'Failed to approve asset');
                                  
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
                                  
                                  const text = await response.text();
                                  let result;
                                  try {
                                    result = JSON.parse(text);
                                  } catch (e) {
                                    if (!response.ok) throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
                                    throw new Error('Invalid response from server');
                                  }
                                  
                                  if (!response.ok) throw new Error(result.error || 'Failed to reject asset');
                                  
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
                        <button className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredAssets.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-neutral-300" size={32} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">No assets found</h3>
            <p className="text-sm text-neutral-500 max-w-xs mx-auto mt-1">
              We couldn't find any assets matching your search. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {isModalOpen && (
        <AssetModal 
          asset={editingAsset} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchAssets();
          }}
        />
      )}

      {/* QR Modal */}
      {isQrModalOpen && qrAsset && (
        <QRModal 
          asset={qrAsset} 
          onClose={() => setIsQrModalOpen(false)} 
        />
      )}
    </div>
  );
}

function QRModal({ asset, onClose }: { asset: any, onClose: () => void }) {
  const qrValue = `Asset: ${asset.name}\nSerial: ${asset.serialNumber || 'N/A'}\nAssigned To: ${asset.assignedTo || 'Unassigned'}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Asset QR Code</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <XIcon size={20} />
          </button>
        </div>
        <div className="p-8 flex flex-col items-center justify-center gap-6">
          <div className="p-4 bg-white border-4 border-neutral-100 rounded-2xl shadow-inner">
            <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={true} />
          </div>
          <div className="text-center space-y-2">
            <p className="font-bold text-lg">{asset.name}</p>
            <p className="text-sm text-neutral-500 font-mono">{asset.serialNumber || 'No Serial'}</p>
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Assigned To</span>
              <p className="text-sm font-medium">{asset.assignedTo || 'Unassigned'}</p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-neutral-50 border-t border-neutral-100">
          <button 
            onClick={onClose}
            className="w-full px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AssetModal({ asset, onClose, onSuccess }: { asset?: any, onClose: () => void, onSuccess: () => void }) {
  const { isAdmin, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: asset?.name || '',
    type: asset?.type || 'Laptop',
    roles: asset?.roles || 'IT Support',
    serialNumber: asset?.serialNumber || '',
    status: asset?.status || 'In Stock',
    location: asset?.location || '',
    date: asset?.date || new Date().toISOString().split('T')[0],
    assignedTo: asset?.assignedTo || (isAdmin ? '' : profile?.email || ''),
    approvalStatus: asset?.approvalStatus || 'Pending',
    remark: asset?.remark || '',
    notes: asset?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch('/api/assets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset?.id,
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

      if (!response.ok) throw new Error(result.error || 'Failed to save asset');

      onSuccess();
    } catch (err: any) {
      console.error('Error saving asset:', err);
      setError(err.message || 'Failed to save asset. Please check your permissions.');
    } finally {
      setIsSubmitting(false);
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
          <h3 className="text-xl font-bold tracking-tight">{asset ? 'Edit Asset' : 'Add New Asset'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <LucideX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Asset Name</label>
              <input
                required
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. MacBook Pro 16"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Type</label>
              <select
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option>Laptop</option>
                <option>Desktop</option>
                <option>Monitor</option>
                <option>Mobile</option>
                <option>Network Device</option>
                <option>Peripheral</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Roles</label>
              <select
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.roles}
                onChange={e => setFormData({ ...formData, roles: e.target.value })}
              >
                <option>DB Network & System Admin Division</option>
                <option>Network Admin</option>
                <option>System Admin</option>
                <option>Database Admin</option>
                <option>IT Support</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Status</label>
              <select
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option>In Use</option>
                <option>In Stock</option>
                <option>Under Repair</option>
                <option>Retired</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Location</label>
              <input
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Office A, Server Room"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Serial Number</label>
              <input
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all font-mono"
                value={formData.serialNumber}
                onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="SN-123456789"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Assignment Status</label>
              <select
                disabled={!isAdmin}
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all disabled:bg-neutral-50 disabled:text-neutral-500"
                value={formData.assignedTo === '' ? 'Unassigned' : 'Assigned'}
                onChange={e => {
                  if (e.target.value === 'Unassigned') {
                    setFormData({ ...formData, assignedTo: '' });
                  } else {
                    setFormData({ ...formData, assignedTo: formData.assignedTo || 'Unassigned' });
                  }
                }}
              >
                <option value="Unassigned">Unassigned</option>
                <option value="Assigned">Assigned</option>
              </select>
            </div>
            {formData.assignedTo !== '' && (
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Assign to (Email/ID)</label>
                <input
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all disabled:bg-neutral-50 disabled:text-neutral-500"
                  value={formData.assignedTo === 'Unassigned' ? '' : formData.assignedTo}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="user@company.com"
                />
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Remark</label>
              <textarea
                className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 outline-none transition-all min-h-[80px]"
                value={formData.remark}
                onChange={e => setFormData({ ...formData, remark: e.target.value })}
                placeholder="Any additional remarks..."
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {asset ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
