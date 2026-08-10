import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Category, User } from '../types/wms';
import { api } from '../lib/api';
import { Pencil, Trash2, RefreshCcw, X, Plus } from 'lucide-react';

interface CategoryManagerProps {
  activeUser: User;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ activeUser }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCategories(true);
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addCategory(name, description);
      setName('');
      description && setDescription('');
      setShowAddForm(false);
      toast.success('Ангилал нэмэгдлээ');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || 'Ангилал нэмэхэд алдаа гарлаа');
    }
  };

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !name.trim()) return;
    try {
      await api.updateCategory(editingCategory.id, name, description);
      setEditingCategory(null);
      setName('');
      setDescription('');
      toast.success('Ангилал шинэчлэгдлээ');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || 'Алдаа гарлаа');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Энэ ангиллыг устгах уу? (Идэвхгүй болгох)')) return;
    try {
      await api.deactivateCategory(id);
      toast.success('Ангилал устгагдлаа');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || 'Алдаа гарлаа');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.reactivateCategory(id);
      toast.success('Ангилал сэргээгдлээ');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || 'Алдаа гарлаа');
    }
  };

  const filteredCategories = categories.filter(c => showInactive ? !c.isActive : c.isActive);

  if (activeUser.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-500">Энэ хуудсанд хандах эрхгүй байна.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ангилал удирдах</h2>
          <p className="text-sm text-gray-500">Барааны ангиллуудыг нэмэх болон засах</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Болих' : '+ Ангилал нэмэх'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ангиллын нэр *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Жишээ нь: Цахилгаан бараа"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тайлбар</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ангиллын тухай дэлгэрэнгүй тайлбар..."
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Хадгалах
            </button>
          </form>
        </div>
      )}

      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer bg-white px-4 py-2 border border-gray-200 rounded-lg shadow-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          Устгасан харуулах
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Нэр</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Тайлбар</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Үүссэн</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Уншиж байна...</td></tr>
            ) : filteredCategories.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Ангилал олдсонгүй</td></tr>
            ) : (
              filteredCategories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {cat.name}
                    {!cat.isActive && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">Идэвхгүй</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(cat.createdAt).toLocaleDateString('mn-MN')}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {cat.isActive ? (
                        <>
                          <button
                            onClick={() => handleEditClick(cat)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                            title="Засах"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(cat.id)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                            title="Устгах"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReactivate(cat.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                        >
                          <RefreshCcw className="w-3 h-3" /> Сэргээх
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" /> Ангилал засах
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ангиллын нэр *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Тайлбар</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Шинэчлэх
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
