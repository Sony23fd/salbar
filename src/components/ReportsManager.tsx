import React, { useState, useEffect } from 'react';
import { InventoryTransaction } from '../types/wms';
import { db } from '../lib/db';
import { FileText, Search, ArrowUpRight, ArrowDownRight, Settings2, Download } from 'lucide-react';

export const ReportsManager: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await db.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.product?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (type: string) => {
    if (type === 'INBOUND') return <ArrowDownRight className="w-4 h-4 text-emerald-600" />;
    if (type === 'OUTBOUND') return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
    return <Settings2 className="w-4 h-4 text-amber-600" />;
  };

  const getTransactionLabel = (type: string) => {
    if (type === 'INBOUND') return 'Орлого (Татан авалт)';
    if (type === 'OUTBOUND') return 'Зарлага (Хүргэлт)';
    return 'Тохируулга';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Агуулахын хөдөлгөөн & Тайлан
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Барааны орлого, зарлага, тохируулгын бүрэн түүх.
          </p>
        </div>
        
        <button
          onClick={() => alert('Excel татах үйлдэл хөгжүүлэгдэж байна')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm border border-slate-200"
        >
          <Download className="w-4 h-4" />
          Excel татах
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Барааны нэр, SKU эсвэл тайлбараар хайх..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs font-medium"
          >
            <option value="ALL">Бүх гүйлгээ</option>
            <option value="INBOUND">Орлого (Татан авалт)</option>
            <option value="OUTBOUND">Зарлага (Хүргэлт)</option>
            <option value="ADJUSTMENT">Тохируулга</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Огноо</th>
                <th className="p-4">Гүйлгээний төрөл</th>
                <th className="p-4">Бараа</th>
                <th className="p-4 text-right">Өмнөх үлдэгдэл</th>
                <th className="p-4 text-right">Тоо хэмжээ</th>
                <th className="p-4 text-right">Шинэ үлдэгдэл</th>
                <th className="p-4">Хариуцсан хэрэглэгч</th>
                <th className="p-4">Тайлбар</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">Уншиж байна...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">Гүйлгээ олдсонгүй.</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-500">
                      {new Date(t.createdAt).toLocaleString('mn-MN')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        {getTransactionIcon(t.type)}
                        <span className={t.type === 'INBOUND' ? 'text-emerald-700' : t.type === 'OUTBOUND' ? 'text-blue-700' : 'text-amber-700'}>
                          {getTransactionLabel(t.type)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{t.product?.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{t.product?.sku}</div>
                    </td>
                    <td className="p-4 text-right text-slate-500 font-mono font-medium">
                      {t.previousStock}
                    </td>
                    <td className="p-4 text-right font-mono font-bold">
                      <span className={t.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-900 font-mono font-bold">
                      {t.newStock}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{t.user?.name}</div>
                      <div className="text-[10px] text-slate-500">{t.user?.role}</div>
                    </td>
                    <td className="p-4 text-slate-600 italic">
                      {t.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
