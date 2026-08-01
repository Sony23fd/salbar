import React, { useState } from 'react';
import { Branch, InactiveBranchAlert, User, BranchType } from '../types/wms';
import { db } from '../lib/db';
import { Building2, Clock, MapPin, Phone, Mail, AlertTriangle, CheckCircle2, ShoppingCart, ShieldAlert, Plus, X, Building, Users, ClipboardList } from 'lucide-react';
import { api } from '../lib/api';

interface BranchManagerProps {
  branches: Branch[];
  inactiveAlerts: InactiveBranchAlert[];
  onQuickOrder: (branchId: string) => void;
  onRefresh: () => void;
  currentUser: User;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  branches,
  inactiveAlerts,
  onQuickOrder,
  onRefresh,
  currentUser,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchInventory, setBranchInventory] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<BranchType>('BRANCH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setName(branch.name);
      setLocation(branch.location);
      setContactPerson(branch.contactPerson);
      setEmail(branch.email);
      setPhone(branch.phone);
      setType(branch.type);
    } else {
      setEditingBranch(null);
      setName('');
      setLocation('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setType('BRANCH');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const openInventoryModal = async (branch: Branch) => {
    setSelectedBranch(branch);
    setShowInventoryModal(true);
    setInventoryLoading(true);
    try {
      const inv = await api.getBranchInventory(branch.id);
      setBranchInventory(inv);
    } catch (err: any) {
      alert(err.message || 'Үлдэгдэл татахад алдаа гарлаа');
    } finally {
      setInventoryLoading(false);
    }
  };

  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setSelectedBranch(null);
    setBranchInventory([]);
  };

  const handleAdjustInventory = async (productId: string, quantityToDeduct: number, type: 'SALE' | 'RETURN') => {
    if (!selectedBranch) return;
    try {
      await api.adjustBranchInventory(selectedBranch.id, { productId, quantityToDeduct, type });
      // Refresh inventory
      const inv = await api.getBranchInventory(selectedBranch.id);
      setBranchInventory(inv);
      alert('Амжилттай хасагдлаа');
    } catch (err: any) {
      alert(err.message || 'Алдаа гарлаа');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, { name, location, contactPerson, email, phone, type });
      } else {
        await api.addBranch({ name, location, contactPerson, email, phone, type });
      }
      onRefresh();
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ салбар/харилцагчийг устгах уу? (Зөөлөн устгал)')) return;
    try {
      await db.deactivateBranch(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Алдаа гарлаа');
    }
  };

  const handleCreateContactTask = async (branch: Branch, days: number) => {
    try {
      await api.createTask({
        title: `Салбартай холбогдох: ${branch.name}`,
        description: `Салбар сүүлийн ${days} хоног идэвхгүй байна. Менежертэй холбогдож шалтгааныг тодруулах.\nУтас: ${branch.phone}\nМенежер: ${branch.contactPerson}`,
        priority: 'HIGH',
        branchId: branch.id,
      });
      alert(`${branch.name} салбартай холбогдох даалгавар үүсгэлээ.`);
    } catch (err) {
      console.error(err);
      alert('Даалгавар үүсгэхэд алдаа гарлаа');
    }
  };

  const handleSetActivityDaysAgo = (branchId: string, daysAgo: number) => {
    // This calls an internal function, not implemented yet, so let's skip
    // db.setBranchLastActivity(branchId, daysAgo);
    // onRefresh();
  };

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Салбар болон Харилцагчид
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Салбар, харилцагчдын удирдлага, идэвхгүй байдлын хяналт
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Нийт: <strong>{branches.length}</strong>
          </span>
          <span className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-bold">
            Идэвхгүй (7+ хоног): <strong>{inactiveAlerts.length}</strong>
          </span>
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors ml-2"
            >
              <Plus className="w-4 h-4" /> Шинээр нэмэх
            </button>
          )}
        </div>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => {
          const isInactive = inactiveAlerts.some((alert) => alert.branchId === b.id);
          const alertInfo = inactiveAlerts.find((alert) => alert.branchId === b.id);
          const isCustomer = b.type === 'CUSTOMER';

          const lastDateFormatted = new Date(b.lastActivityAt).toLocaleString('mn-MN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={b.id}
              className={`bg-white border rounded-2xl p-5 space-y-4 shadow-xs transition-all ${
                isInactive
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                    {b.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isCustomer ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {isCustomer ? <Users className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                      {isCustomer ? 'Харилцагч' : 'Дотоод салбар'}
                    </span>
                    {isInactive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3" /> {alertInfo?.daysInactive} хоног
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {b.location}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Менежер</span>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">{b.contactPerson}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {b.phone}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Сүүлийн идэвх</span>
                  <div className="font-semibold text-amber-800 mt-0.5 flex items-center gap-1 truncate">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {lastDateFormatted}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {b.email}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(b)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors"
                    >
                      Засах
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-colors"
                    >
                      Устгах
                    </button>
                    {isInactive && (
                      <button
                        onClick={() => handleCreateContactTask(b, alertInfo?.daysInactive || 0)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors inline-flex items-center gap-1"
                        title="Холбогдох даалгавар үүсгэх"
                      >
                        <ClipboardList className="w-3 h-3" /> Даалгавар
                      </button>
                    )}
                  </div>
                ) : <div />}

                <button
                  onClick={() => openInventoryModal(b)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors ml-auto"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Үлдэгдэл
                </button>

                <button
                  onClick={() => onQuickOrder(b.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Захиалга
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> 
                {editingBranch ? 'Мэдээлэл засах' : 'Шинээр бүртгэх'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Төрөл *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BranchType)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="BRANCH">Дотоод салбар</option>
                    <option value="CUSTOMER">Гадны харилцагч</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Нэр *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хаяг байршил *</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хариуцсан хүн *</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Утас *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Имэйл хаяг *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && selectedBranch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  Салбарын үлдэгдэл: {selectedBranch.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Салбар дээрх барааны үлдэгдэл болон мөнгөн дүн</p>
              </div>
              <button
                onClick={closeInventoryModal}
                className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-xl transition-colors border border-slate-200 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {inventoryLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : branchInventory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">Салбар дээр үлдэгдэл алга байна.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-sm font-semibold text-blue-800">Нийт мөнгөн дүн:</span>
                    <span className="text-lg font-bold text-blue-700">
                      ₮{branchInventory.reduce((sum, item) => sum + (item.quantity * Number(item.product?.unitPrice || 0)), 0).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Бараа</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Үнэ</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Үлдэгдэл</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Нийт дүн</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {branchInventory.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-slate-900">{item.product?.name}</div>
                              <div className="text-xs text-slate-500">{item.product?.sku}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700 font-medium">₮{Number(item.product?.unitPrice || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">₮{(item.quantity * Number(item.product?.unitPrice || 0)).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              {item.quantity > 0 && (isAdmin || currentUser.role === 'WAREHOUSE_WORKER') && (
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => {
                                    const q = prompt(`Зарлагадах тоо (дээд тал нь ${item.quantity}):`);
                                    if (q && !isNaN(Number(q)) && Number(q) > 0 && Number(q) <= item.quantity) {
                                      handleAdjustInventory(item.productId, Number(q), 'SALE');
                                    }
                                  }} className="text-[11px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                                    Зарлага
                                  </button>
                                  <button onClick={() => {
                                    const q = prompt(`Буцаах тоо (дээд тал нь ${item.quantity}):`);
                                    if (q && !isNaN(Number(q)) && Number(q) > 0 && Number(q) <= item.quantity) {
                                      handleAdjustInventory(item.productId, Number(q), 'RETURN');
                                    }
                                  }} className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200">
                                    Буцаалт
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
