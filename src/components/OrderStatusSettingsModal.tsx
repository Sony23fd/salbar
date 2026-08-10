import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, GripVertical, Trash2, Save, Settings } from 'lucide-react';
import { OrderStatusConfig } from '../types/wms';
import { api } from '../lib/api';

interface OrderStatusSettingsModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export const OrderStatusSettingsModal: React.FC<OrderStatusSettingsModalProps> = ({ onClose, onRefresh }) => {
  const [statuses, setStatuses] = useState<OrderStatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState({
    code: '',
    label: '',
    colorClass: 'bg-blue-100 text-blue-800 border-blue-200'
  });

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const data = await api.getOrderStatuses();
      setStatuses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const handleAdd = async () => {
    if (!newStatus.code || !newStatus.label) return setError('Код болон нэрээ оруулна уу');
    setIsSaving(true);
    try {
      await api.createOrderStatus({
        ...newStatus,
        orderIndex: statuses.length,
        isSystem: false
      });
      setNewStatus({ code: '', label: '', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' });
      await loadStatuses();
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ төлөвийг устгахдаа итгэлтэй байна уу?')) return;
    try {
      await api.deleteOrderStatus(id);
      await loadStatuses();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (id: string, field: string, value: string) => {
    const status = statuses.find(s => s.id === id);
    if (!status) return;
    try {
      await api.updateOrderStatus(id, { ...status, [field]: value });
      await loadStatuses();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Захиалгын төлөв тохиргоо</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium">{error}</div>}
          
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Шинэ төлөв нэмэх</h3>
            <div className="flex gap-2 items-start">
              <input 
                type="text" 
                placeholder="Код (CODE_NAME)" 
                value={newStatus.code}
                onChange={e => setNewStatus({...newStatus, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase"
              />
              <input 
                type="text" 
                placeholder="Нэр (Жишээ: Ачигдсан)" 
                value={newStatus.label}
                onChange={e => setNewStatus({...newStatus, label: e.target.value})}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <select
                value={newStatus.colorClass}
                onChange={e => setNewStatus({...newStatus, colorClass: e.target.value})}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="bg-slate-100 text-slate-800 border-slate-200">Саарал</option>
                <option value="bg-blue-100 text-blue-800 border-blue-200">Цэнхэр</option>
                <option value="bg-amber-100 text-amber-800 border-amber-200">Шар</option>
                <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Ногоон</option>
                <option value="bg-purple-100 text-purple-800 border-purple-200">Нил ягаан</option>
                <option value="bg-red-100 text-red-800 border-red-200">Улаан</option>
              </select>
              <button 
                onClick={handleAdd}
                disabled={isSaving}
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Одоо байгаа төлөвүүд</h3>
            {loading ? (
              <p className="text-xs text-slate-500 text-center py-4">Уншиж байна...</p>
            ) : (
              <div className="space-y-2">
                {statuses.map(st => (
                  <div key={st.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 cursor-move">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input 
                        type="text" 
                        value={st.code} 
                        disabled 
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-500 uppercase font-mono"
                      />
                      <input 
                        type="text" 
                        value={st.label} 
                        onChange={e => handleUpdate(st.id, 'label', e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <select
                        value={st.colorClass}
                        onChange={e => handleUpdate(st.id, 'colorClass', e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="bg-slate-100 text-slate-800 border-slate-200">Саарал</option>
                        <option value="bg-blue-100 text-blue-800 border-blue-200">Цэнхэр</option>
                        <option value="bg-amber-100 text-amber-800 border-amber-200">Шар</option>
                        <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Ногоон</option>
                        <option value="bg-purple-100 text-purple-800 border-purple-200">Нил ягаан</option>
                        <option value="bg-red-100 text-red-800 border-red-200">Улаан</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${st.colorClass}`}>
                        ҮЗЭХ
                      </div>
                      <button 
                        onClick={() => handleDelete(st.id)}
                        disabled={st.isSystem}
                        className={`p-1.5 rounded-lg transition-colors ${st.isSystem ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                        title={st.isSystem ? "Системийн төлөвийг устгах боломжгүй" : "Устгах"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
