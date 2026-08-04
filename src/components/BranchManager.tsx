import React, { useState } from 'react';
import { Branch, InactiveBranchAlert, User, BranchType, Order, OrderStatus } from '../types/wms';
import { db } from '../lib/db';
import { Building2, Clock, MapPin, Phone, Mail, AlertTriangle, CheckCircle2, ShoppingCart, ShieldAlert, Plus, X, Building, Users, ClipboardList, History, Package } from 'lucide-react';
import { api } from '../lib/api';

interface BranchManagerProps {
  branches: Branch[];
  orders: Order[];
  inactiveAlerts: InactiveBranchAlert[];
  onQuickOrder: (branchId: string) => void;
  onRefresh: () => void;
  currentUser: User;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  branches,
  orders,
  inactiveAlerts,
  onQuickOrder,
  onRefresh,
  currentUser,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [historyBranchId, setHistoryBranchId] = useState<string | null>(null);
  const [expandedOrderHistoryId, setExpandedOrderHistoryId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<BranchType>('BRANCH');
  const [marginPercent, setMarginPercent] = useState<number>(0);
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
      setMarginPercent(branch.marginPercent || 0);
    } else {
      setEditingBranch(null);
      setName('');
      setLocation('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setType('BRANCH');
      setMarginPercent(0);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedBranchId(prev => (prev === id ? null : id));
  };

  const handleAdjustInventory = async (branchId: string, productId: string, quantityToDeduct: number, type: 'SALE' | 'RETURN') => {
    try {
      await api.adjustBranchInventory(branchId, { productId, quantityToDeduct, type });
      onRefresh();
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
        await api.updateBranch(editingBranch.id, { name, location, contactPerson, email, phone, type, marginPercent });
      } else {
        await api.addBranch({ name, location, contactPerson, email, phone, type, marginPercent });
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
                    {(b.marginPercent !== undefined && b.marginPercent !== 0) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Нэмэгдэл үнэ: {b.marginPercent > 0 ? '+' : ''}{b.marginPercent}%
                      </span>
                    )}
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

              {/* Inventory Summary */}
              {(() => {
                const inventory = b.inventory || [];
                const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * Number((item as any).product?.unitPrice || 0)), 0);
                const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
                const hasLowStock = inventory.some(item => item.quantity > 0 && item.quantity < 5);

                return (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${hasLowStock ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Нийт үлдэгдэл</div>
                      <div className={`font-bold text-sm ${hasLowStock ? 'text-red-700' : 'text-emerald-700'}`}>₮{totalValue.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Тоо ширхэг</div>
                      <div className="font-bold text-sm text-slate-700">{totalItems} ш</div>
                    </div>
                  </div>
                );
              })()}

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
                  onClick={() => toggleExpand(b.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ml-auto border ${expandedBranchId === b.id ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  {expandedBranchId === b.id ? 'Хаах' : 'Үлдэгдэл'}
                </button>

                <button
                  onClick={() => setHistoryBranchId(b.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  Түүх
                </button>

                <button
                  onClick={() => onQuickOrder(b.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Захиалга
                </button>
              </div>

              {/* Accordion Detail */}
              {expandedBranchId === b.id && (
                <div className="mt-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Үлдэгдлийн дэлгэрэнгүй</h4>
                  {(!b.inventory || b.inventory.length === 0) ? (
                    <div className="text-center py-4 text-slate-500 text-xs">Үлдэгдэл алга байна.</div>
                  ) : (
                    <div className="space-y-2">
                      {b.inventory.map((item) => {
                        const product = (item as any).product;
                        const isLow = item.quantity > 0 && item.quantity < 5;
                        return (
                          <div key={item.id} className={`p-2 rounded-lg border text-xs flex flex-col gap-2 ${isLow ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold text-slate-900">{product?.name}</div>
                                <div className="text-[10px] text-slate-500">{product?.sku} | ₮{Number(product?.unitPrice || 0).toLocaleString()}</div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${isLow ? 'text-red-600' : 'text-blue-600'}`}>
                                  {item.quantity} ш
                                  {isLow && <AlertTriangle className="w-3 h-3 inline-block ml-1 text-red-500" />}
                                </div>
                                <div className="font-bold text-slate-800">
                                  ₮{(item.quantity * Number(product?.unitPrice || 0)).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            {item.quantity > 0 && (isAdmin || currentUser.role === 'WAREHOUSE_WORKER') && (
                              <div className="flex gap-1 justify-end mt-1 border-t border-slate-100/50 pt-1.5">
                                <button onClick={() => {
                                  const q = prompt(`Зарлагадах тоо (дээд тал нь ${item.quantity}):`);
                                  if (q && !isNaN(Number(q)) && Number(q) > 0 && Number(q) <= item.quantity) {
                                    handleAdjustInventory(b.id, item.productId, Number(q), 'SALE');
                                  }
                                }} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors">
                                  Зарлага
                                </button>
                                <button onClick={() => {
                                  const q = prompt(`Буцаах тоо (дээд тал нь ${item.quantity}):`);
                                  if (q && !isNaN(Number(q)) && Number(q) > 0 && Number(q) <= item.quantity) {
                                    handleAdjustInventory(b.id, item.productId, Number(q), 'RETURN');
                                  }
                                }} className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 transition-colors">
                                  Буцаалт
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History Modal */}
      {historyBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-2xl">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                {branches.find((b) => b.id === historyBranchId)?.name} - Захиалгын түүх
              </h3>
              <button onClick={() => { setHistoryBranchId(null); setExpandedOrderHistoryId(null); }} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {(() => {
                const branchOrders = orders.filter((o) => o.branchId === historyBranchId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                if (branchOrders.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">Захиалга алга байна</h4>
                      <p className="text-xs text-slate-500">Энэ салбар дээр одоогоор захиалга бүртгэгдээгүй байна.</p>
                    </div>
                  );
                }
                
                const statusColors: Record<OrderStatus, string> = {
                  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
                  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
                  PACKED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  IN_TRANSIT: 'bg-purple-50 text-purple-700 border-purple-200',
                  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
                };
                
                return (
                  <div className="space-y-3">
                    {branchOrders.map((order) => {
                      const isExpanded = expandedOrderHistoryId === order.id;
                      return (
                        <div key={order.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                          <div 
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                            onClick={() => setExpandedOrderHistoryId(isExpanded ? null : order.id)}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-900">{order.orderNumber}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[order.status]}`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(order.createdAt).toLocaleString('mn-MN')}
                                </span>
                                <span>•</span>
                                <span>Үүсгэсэн: {order.createdByName}</span>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                              <div>
                                <div className="text-[10px] uppercase font-bold text-slate-400">Нийт дүн</div>
                                <div className="text-sm font-bold text-slate-800">₮{order.totalAmount.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50 p-4">
                              <h5 className="text-[11px] uppercase font-bold text-slate-500 mb-3">Захиалсан бараанууд ({order.items.length})</h5>
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg">
                                    <div>
                                      <div className="text-xs font-semibold text-slate-800">{item.productName}</div>
                                      <div className="text-[10px] text-slate-500">{item.sku} | ₮{item.unitPrice.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-bold text-blue-600">{item.quantity} ш</div>
                                      <div className="text-[11px] font-bold text-slate-700">₮{item.totalPrice.toLocaleString()}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {order.deliveredAt && (
                                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Хүргэгдсэн: {new Date(order.deliveredAt).toLocaleString('mn-MN')} (Жолооч: {order.deliveredByName})
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 bg-white border-t border-slate-200 text-right shrink-0 rounded-b-2xl">
              <button 
                onClick={() => { setHistoryBranchId(null); setExpandedOrderHistoryId(null); }}
                className="px-5 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ашгийн хувь (Margin %)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                    placeholder="Жишээ нь: 15 эсвэл -10"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Үндсэн үнэн дээр нэмэгдэх (эсвэл хасагдах) хувь</p>
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
    </div>
  );
};
