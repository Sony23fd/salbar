import React, { useState } from 'react';
import { X, Search, Plus, Minus, AlertCircle, Trash2 } from 'lucide-react';
import { Product } from '../types/wms';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface Props {
  materials: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MaterialIssueModal: React.FC<Props> = ({ materials, onClose, onSuccess }) => {
  const [issueType, setIssueType] = useState('OUTBOUND'); // OUTBOUND or ADJUSTMENT
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedItems, setSelectedItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);

  React.useEffect(() => {
    api.getExpiringBatches().then(setExpiringBatches).catch(console.error);
  }, []);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast.error('Үлдэгдэлгүй бараа байна.');
      return;
    }
    const existing = selectedItems.find(i => i.product.id === product.id);
    if (!existing) {
      setSelectedItems([...selectedItems, { product, quantity: 1 }]);
      setSearchQuery('');
    }
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(i => i.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    setSelectedItems(selectedItems.map(item => {
      if (item.product.id === productId) {
        if (!isNaN(num) && num > item.product.stockQuantity) {
          toast.error(`${item.product.name} үлдэгдэл хүрэхгүй байна!`);
          return { ...item, quantity: item.product.stockQuantity };
        }
        return { ...item, quantity: isNaN(num) ? 0 : num };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      toast.error('Зарлагадах бараа сонгоно уу');
      return;
    }

    const invalidItems = selectedItems.filter(i => i.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error('Тоо хэмжээ 0-ээс их байх ёстой');
      return;
    }

    const itemsPayload = selectedItems.map(i => ({
      productId: i.product.id,
      quantity: i.quantity
    }));

    try {
      setIsSubmitting(true);
      await api.issueMaterials(itemsPayload, notes, issueType);
      toast.success('Амжилттай зарлагадлаа');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">ТЭМ & Сав баглаа зарлагадах</h2>
            <p className="text-sm text-slate-500 mt-1">
              Үйлдвэрлэлд нэмэлтээр олгох эсвэл хорогдлоор гаргах
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Search & Select */}
          <div className="w-full md:w-1/2 border-r border-slate-100 flex flex-col bg-slate-50/50">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Бараа хайх..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredMaterials.map(m => {
                const expiring = expiringBatches.find(b => b.productId === m.id);
                return (
                  <div 
                    key={m.id} 
                    onClick={() => handleAddItem(m)}
                    className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                      selectedItems.some(i => i.product.id === m.id)
                        ? 'border-blue-500 bg-blue-50/50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{m.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{m.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-slate-900">{m.stockQuantity} {m.unit}</div>
                        <div className="text-[10px] text-slate-500">Үлдэгдэл</div>
                      </div>
                    </div>
                    {expiring && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs flex items-start gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-800">FEFO: Тун удахгүй хугацаа нь дуусах багц байна!</strong>
                          <div className="text-amber-700 text-[10px] mt-0.5 font-mono">
                            Парц: {expiring.batchNumber} | Хугацаа: {new Date(expiring.expiryDate).toLocaleDateString()} | Үлдэгдэл: {expiring.quantity}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredMaterials.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Илэрц олдсонгүй
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Selected Items & Form */}
          <div className="w-full md:w-1/2 flex flex-col bg-white">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Зарлагын төрөл</label>
                  <select
                    value={issueType}
                    onChange={e => setIssueType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-900"
                  >
                    <option value="OUTBOUND">Үйлдвэрлэлд олгосон / Бусад зарлага</option>
                    <option value="ADJUSTMENT">Хорогдол / Устгал</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Тайлбар (Заавал биш)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Жишээ: Туршилтад олгосон, Урагдсан шуудай г.м"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-700 uppercase mb-4 flex items-center justify-between">
                  <span>Сонгосон бараа ({selectedItems.length})</span>
                </h3>
                
                {selectedItems.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Баруун талаас зарлагадах бараагаа сонгоно уу</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map(item => (
                      <div key={item.product.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm truncate">{item.product.name}</div>
                          <div className="text-[10px] text-slate-500">Үлдэгдэл: {item.product.stockQuantity} {item.product.unit}</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            max={item.product.stockQuantity}
                            value={item.quantity || ''}
                            onChange={e => handleQuantityChange(item.product.id, e.target.value)}
                            className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                          />
                          <span className="text-xs text-slate-500 w-4">{item.product.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedItems.length === 0}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Зарлагадах'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
