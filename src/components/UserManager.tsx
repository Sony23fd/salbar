import React, { useState, useEffect } from 'react';
import { User, Role } from '../types/wms';
import { api } from '../lib/api';
import { Shield, Plus, Edit2, Trash2, X, Check, Search, AlertCircle } from 'lucide-react';

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAREHOUSE_WORKER' as Role
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Blank implies no change
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'WAREHOUSE_WORKER'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        const payload: any = { name: formData.name, email: formData.email, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await api.updateUser(editingUser.id, payload);
      } else {
        await api.addUser(formData);
      }
      await loadUsers();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (confirm('Та энэ хэрэглэгчийг идэвхгүй болгохдоо итгэлтэй байна уу?')) {
      try {
        await api.deactivateUser(id);
        await loadUsers();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const roleLabels: Record<Role, string> = {
    ADMIN: 'Админ',
    WAREHOUSE_WORKER: 'Агуулахын ажилтан',
    DELIVERY_DRIVER: 'Түгээлтийн жолооч',
  };

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    WAREHOUSE_WORKER: 'bg-blue-100 text-blue-700 border-blue-200',
    DELIVERY_DRIVER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Хандах эрхгүй байна</h2>
        <p className="text-sm">Энэ хуудсанд зөвхөн АДМИН хандах боломжтой.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Ажилчдын удирдлага
          </h2>
          <p className="text-sm text-slate-500 mt-1">Системд нэвтрэх хэрэглэгчид болон тэдний эрхийг тохируулах</p>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Хэрэглэгч нэмэх</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Ажилтан</th>
                <th className="px-6 py-4">Эрх</th>
                <th className="px-6 py-4 text-center">Төлөв</th>
                <th className="px-6 py-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Уншиж байна...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Бүртгэлтэй хэрэглэгч алга байна.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${
                          user.role === 'ADMIN' ? 'from-purple-500 to-indigo-600' :
                          user.role === 'WAREHOUSE_WORKER' ? 'from-blue-500 to-cyan-600' :
                          'from-emerald-500 to-teal-600'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.name}</div>
                          <div className="text-[11px] text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${roleColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold">
                          <Check className="w-3 h-3" />
                          Идэвхтэй
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-semibold">
                          <X className="w-3 h-3" />
                          Идэвхгүй
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Засах"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {currentUser.id !== user.id && user.isActive && (
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Идэвхгүй болгох"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Хэрэглэгч засах' : 'Шинэ хэрэглэгч үүсгэх'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Нэр</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">И-мэйл (Нэвтрэх нэр)</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Нууц үг {editingUser && <span className="text-slate-400 font-normal lowercase">(өөрчлөхгүй бол хоосон орхино)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Эрх</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                >
                  <option value="WAREHOUSE_WORKER">Агуулахын ажилтан</option>
                  <option value="DELIVERY_DRIVER">Түгээлтийн жолооч</option>
                  <option value="ADMIN">Админ</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md"
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
