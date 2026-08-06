import React, { useState, useEffect } from 'react';
import { User, Role } from '../types/wms';
import { api } from '../lib/api';
import { Shield, Plus, Edit2, Trash2, X, Check, Search, AlertCircle, Key, RefreshCw } from 'lucide-react';

interface UserManagerProps {
  currentUser: User;
}

interface ModulePermission {
  id: string;
  name: string;
  category: string;
  description: string;
}

const ALL_MODULES: ModulePermission[] = [
  { id: 'dashboard', name: 'Хяналтын самбар', category: 'Удирдлага', description: 'Системийн нэгдсэн статистик & KPI харах' },
  { id: 'tasks', name: 'Ажлын төлөвлөгөө', category: 'Удирдлага', description: 'Ажилчдын даалгавар, төлөвлөгөө удирдах' },
  { id: 'inventory', name: 'Агуулах ба Бэлэн бараа', category: 'Агуулах & Бараа', description: 'Бэлэн бүтээгдэхүүний агуулахын үлдэгдэл удирдах' },
  { id: 'materials', name: 'ТЭМ & Сав баглаа', category: 'Агуулах & Бараа', description: 'Түүхий эд, сав баглааны нөөц & өртөг удирдах' },
  { id: 'manufacturing', name: 'Үйлдвэрлэл & Санхүү', category: 'Санхүү & Үйлдвэрлэл', description: 'Жор (BOM), Парцын бодит өртөг & маржин тайлан' },
  { id: 'orders', name: 'Салбарын захиалга', category: 'Борлуулалт & Захиалга', description: 'Салбаруудын барааны захиалга хүлээн авах' },
  { id: 'deliveries', name: 'Хүргэлт & Түгээлт', category: 'Логистик', description: 'Хүргэлтийн жолооч & баглаа боодол' },
  { id: 'branches', name: 'Салбарын идэвх', category: 'Салбар', description: 'Салбаруудын үйл ажиллагаа & идэвх' },
  { id: 'categories', name: 'Ангилал удирдах', category: 'Систем', description: 'Бараа материалын ангилал' },
  { id: 'reports', name: 'Хөдөлгөөн & Тайлан', category: 'Санхүү & Үйлдвэрлэл', description: 'Санхүүгийн хөдөлгөөн ба агуулахын тайлан' },
  { id: 'users', name: 'Ажилчдын удирдлага', category: 'Систем', description: 'Хэрэглэгчийн эрх болон шинэ ажилтан бүртгэх' },
  { id: 'audit', name: 'Аудит лог', category: 'Систем', description: 'Системийн үйл ажиллагааны аудит лог' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ALL_MODULES.map(m => m.id),
  FINANCE: ['dashboard', 'materials', 'manufacturing', 'reports'],
  WAREHOUSE_WORKER: ['dashboard', 'tasks', 'inventory', 'materials', 'manufacturing', 'orders', 'reports'],
  DELIVERY_DRIVER: ['dashboard', 'tasks', 'deliveries']
};

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Permission Matrix Modal State
  const [permissionTargetUser, setPermissionTargetUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

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
        password: '',
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
  };

  const handleOpenPermissionModal = (user: User) => {
    setPermissionTargetUser(user);
    // If custom permissions set, use them; else fallback to default role permissions
    const currentPerms = (user.permissions && user.permissions.length > 0)
      ? user.permissions
      : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);
    setSelectedPermissions(currentPerms);
  };

  const handleTogglePermission = (moduleId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleResetToRoleDefault = () => {
    if (permissionTargetUser) {
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[permissionTargetUser.role] || [];
      setSelectedPermissions(defaultPerms);
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionTargetUser) return;
    setIsSavingPermissions(true);
    try {
      await api.updateUser(permissionTargetUser.id, {
        permissions: selectedPermissions
      });
      alert(`'${permissionTargetUser.name}' ажилтны эрх амжилттай шинэчлэгдлээ!`);
      setPermissionTargetUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Эрх хадгалахад алдаа гарлаа.');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {})
        });
      } else {
        await api.addUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password || 'password123',
          permissions: DEFAULT_ROLE_PERMISSIONS[formData.role]
        });
      }
      handleCloseModal();
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (window.confirm('Энэ хэрэглэгчийг идэвхгүй болгохдоо итгэлтэй байна уу?')) {
      try {
        await api.deactivateUser(id);
        loadUsers();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FINANCE':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'WAREHOUSE_WORKER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELIVERY_DRIVER':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'ADMIN': return 'Админ';
      case 'FINANCE': return 'Санхүүгийн ажилтан';
      case 'WAREHOUSE_WORKER': return 'Агуулахын ажилтан';
      case 'DELIVERY_DRIVER': return 'Хүргэлтийн жолооч';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Ажилчдын Удирдлага & Эрхийн Матриц
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Системийн хэрэглэгчид үүсгэх, тэдний модуль бүрээрх хандах эрхийг уян хатнаар тохируулах болон идэвхгүйжүүлэх
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" /> Шинэ ажилтан бүртгэх
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-3.5 font-bold text-[11px] uppercase">Ажилтны нэр</th>
                <th className="px-6 py-3.5 font-bold text-[11px] uppercase">Имэйл / Нэвтрэх нэр</th>
                <th className="px-6 py-3.5 font-bold text-[11px] uppercase">Үндсэн рол</th>
                <th className="px-6 py-3.5 font-bold text-[11px] uppercase">Нээлттэй Модулийн Тоо</th>
                <th className="px-6 py-3.5 font-bold text-[11px] uppercase text-center">Төлөв</th>
                <th className="px-6 py-3.5 font-bold text-[11px] uppercase text-center">Үйлдэл & Эрх</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Ачааллаж байна...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Хэрэглэгч олдсонгүй.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const activePermsCount = (user.permissions && user.permissions.length > 0)
                    ? user.permissions.length
                    : (DEFAULT_ROLE_PERMISSIONS[user.role] || []).length;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Key className="w-3.5 h-3.5" /> {activePermsCount} / {ALL_MODULES.length} модуль
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                            <Check className="w-3 h-3" /> Идэвхтэй
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200">
                            <X className="w-3 h-3" /> Идэвхгүй
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center space-x-1.5">
                        <button
                          onClick={() => handleOpenPermissionModal(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors shadow-xs"
                          title="Модулийн эрхийг уян хатнаар тохируулах"
                        >
                          <Key className="w-3.5 h-3.5" /> Эрх тохируулах
                        </button>
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Хэрэглэгч засах"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentUser.id !== user.id && user.isActive && (
                          <button
                            onClick={() => handleDeactivate(user.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Идэвхгүй болгох"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Хэрэглэгч засах' : 'Шинэ ажилтан бүртгэх'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ажилтны нэр *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">И-мэйл (Нэвтрэх нэр) *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Нууц үг {editingUser && <span className="text-slate-400 font-normal lowercase">(өөрчлөхгүй бол хоосон орхино)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Үндсэн Рол *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="WAREHOUSE_WORKER">Агуулахын ажилтан</option>
                  <option value="FINANCE">Санхүүгийн ажилтан</option>
                  <option value="DELIVERY_DRIVER">Түгээлтийн жолооч</option>
                  <option value="ADMIN">Админ</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DYNAMIC PERMISSION MATRIX MANAGEMENT */}
      {permissionTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" /> Ажилтны Модулиудын Эрхийн Матриц
                </h3>
                <p className="text-xs text-slate-500">
                  {permissionTargetUser.name} ({permissionTargetUser.email}) — Рол: <span className="font-bold text-indigo-600">{getRoleLabel(permissionTargetUser.role)}</span>
                </p>
              </div>
              <button onClick={() => setPermissionTargetUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 shrink-0 text-xs">
              <span className="text-indigo-900 font-medium">
                Сонгогдсон эрх: <strong className="font-bold">{selectedPermissions.length}</strong> / {ALL_MODULES.length} модуль нээлттэй байна.
              </span>
              <button
                type="button"
                onClick={handleResetToRoleDefault}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Ролийн стандартыг сэргээх
              </button>
            </div>

            {/* Permission Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_MODULES.map((mod) => {
                  const isChecked = selectedPermissions.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      onClick={() => handleTogglePermission(mod.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-indigo-50/50 border-indigo-300 shadow-2xs'
                          : 'bg-white border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container onClick
                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between gap-2">
                          <span>{mod.name}</span>
                          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {mod.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setPermissionTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Цуцлах
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                Эрхийн Тохиргоо Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
