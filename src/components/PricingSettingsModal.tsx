import React, { useState, useEffect } from 'react';
import { X, GripVertical, Save, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface PricingSettingsModalProps {
  onClose: () => void;
}

export type PricingStep = 'profit' | 'commission' | 'vat' | 'branchMargin';

const STEP_LABELS: Record<PricingStep, string> = {
  profit: 'Ашгийн хувь (Бүтээгдэхүүн)',
  commission: 'Борлуулалтын хувь (Бүтээгдэхүүн)',
  vat: 'НӨАТ (Бүтээгдэхүүн)',
  branchMargin: 'Салбарын маржин (Салбар)',
};

const DEFAULT_ORDER: PricingStep[] = ['profit', 'commission', 'vat', 'branchMargin'];

export const PricingSettingsModal: React.FC<PricingSettingsModalProps> = ({ onClose }) => {
  const [order, setOrder] = useState<PricingStep[]>(DEFAULT_ORDER);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<PricingStep | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const setting = await api.getSystemSetting('PRICING_ORDER');
      if (setting && setting.value) {
        setOrder(JSON.parse(setting.value));
      }
    } catch (err) {
      console.error(err);
      toast.error('Тохиргоог дуудахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.setSystemSetting('PRICING_ORDER', JSON.stringify(order));
      toast.success('Тохиргоо амжилттай хадгалагдлаа!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: PricingStep) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data
    e.dataTransfer.setData('text/plain', item);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: PricingStep) => {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedItem || draggedItem === targetItem) return;

    const draggedIndex = order.indexOf(draggedItem);
    const targetIndex = order.indexOf(targetItem);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...order];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    setOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Үнийн бодолтын дараалал</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-4 bg-blue-50 text-blue-800 p-3 rounded-xl">
                Дараах хувиуд дээрээс доош шатлан бодогдож эцсийн үнэ гарна. 
                (Жишээлбэл, 2-р шатны хувь нь 1-р шатны дүн дээр нэмэгдэж бодогдоно). 
                Хулганаар чирж дарааллыг нь солино уу.
              </p>

              <div className="space-y-2">
                {order.map((step, index) => (
                  <div
                    key={step}
                    draggable
                    onDragStart={(e) => handleDragStart(e, step)}
                    onDragOver={(e) => handleDragOver(e, step)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      draggedItem === step 
                        ? 'border-blue-500 bg-blue-50 opacity-50' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } cursor-move transition-colors`}
                  >
                    <div className="text-slate-400">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-700">
                        {index + 1}. {STEP_LABELS[step]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Цуцлах
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Хадгалах
          </button>
        </div>
      </div>
    </div>
  );
};
