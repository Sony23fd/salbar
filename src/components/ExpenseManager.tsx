import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { OperatingExpense, User } from '../types/wms';
import { api } from '../lib/api';
import { Receipt, Plus, Trash2, Calendar, FileText, IndianRupee, X } from 'lucide-react';

interface ExpenseManagerProps {
  currentUser: User;
}

const EXPENSE_TYPES = [
  'Цалин',
  'Түрээс',
  'Ус, тог, дулаан',
  'Түлш, шатахуун',
  'Маркетинг',
  'Оффис, бичиг хэрэг',
  'Бусад'
];

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Цалин',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/expenses?startDate=${startDate}&endDate=${endDate}`);
      setExpenses(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Зардал уншихад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error('Үнийн дүнг зөв оруулна уу');
      return;
    }

    try {
      await api.post('/expenses', formData);
      toast.success('Зардал амжилттай бүртгэгдлээ');
      setShowForm(false);
      setFormData({
        type: 'Цалин',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Алдаа гарлаа');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Энэ зардлыг устгах уу?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Устгагдлаа');
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Алдаа гарлаа');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-500" />
            Тогтмол зардал бүртгэл
          </h2>
          <p className="text-slate-500 text-sm mt-1">Цалин, түрээс болон бусад үйл ажиллагааны зардлууд</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500"
          />
          {(currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE') && (
            <button
              onClick={() => setShowForm(true)}
              className="ml-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Шинэ зардал
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Огноо</th>
                    <th className="p-4">Төрөл</th>
                    <th className="p-4 text-right">Дүн (₮)</th>
                    <th className="p-4">Тайлбар</th>
                    <th className="p-4">Бүртгэсэн</th>
                    <th className="p-4 text-center">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">Уншиж байна...</td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">Зардал бүртгэгдээгүй байна</td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-600 font-medium">
                          {new Date(exp.expenseDate).toLocaleDateString('mn-MN')}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-[10px]">
                            {exp.type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-slate-900 font-mono">
                          {Number(exp.amount).toLocaleString()}₮
                        </td>
                        <td className="p-4 text-slate-500 max-w-[200px] truncate" title={exp.notes || ''}>
                          {exp.notes || '-'}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-900">{exp.recordedBy?.name}</div>
                        </td>
                        <td className="p-4 text-center">
                          {(currentUser.role === 'ADMIN' || currentUser.id === exp.recordedById) && (
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Устгах"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 shadow-sm text-white">
            <div className="flex items-center gap-2 text-indigo-100 font-bold text-xs uppercase tracking-wider mb-2">
              <IndianRupee className="w-4 h-4" /> Нийт зардал
            </div>
            <div className="text-3xl font-black font-mono">
              {expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}₮
            </div>
            <p className="text-xs text-indigo-200 mt-2">
              Сонгосон хугацааны нийт үйл ажиллагааны зардал
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Зардлын задаргаа</h3>
            <div className="space-y-3">
              {Object.entries(
                expenses.reduce((acc, exp) => {
                  acc[exp.type] = (acc[exp.type] || 0) + Number(exp.amount);
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([type, amount]) => (
                <div key={type} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{type}</span>
                  <span className="font-black text-slate-900 font-mono">{amount.toLocaleString()}₮</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Шинэ зардал бүртгэх</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Зардлын төрөл</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {EXPENSE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Мөнгөн дүн (₮)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Огноо</label>
                <input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Тайлбар (Заавал биш)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Нэмэлт мэдээлэл..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
