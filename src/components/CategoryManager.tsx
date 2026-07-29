import React, { useState, useEffect } from 'react';
import { Category, User } from '../types/wms';
import { db } from '../lib/db';

interface CategoryManagerProps {
  activeUser: User;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ activeUser }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await db.getCategories();
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
      await db.addCategory(name, description);
      setName('');
      setDescription('');
      setShowAddForm(false);
      fetchCategories();
    } catch (e: any) {
      alert(e.message || 'Error adding category');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Энэ ангиллыг устгах уу? (Зөөлөн устгал)')) return;
    try {
      await db.deactivateCategory(id);
      fetchCategories();
    } catch (e: any) {
      alert(e.message || 'Error deactivating category');
    }
  };

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
              <tr><td colSpan={4} className="px-6 py-4 text-center">Уншиж байна...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Ангилал олдсонгүй</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(cat.createdAt).toLocaleDateString('mn-MN')}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeactivate(cat.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Устгах
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
