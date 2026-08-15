import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Branch, InactiveBranchAlert, User, BranchType, Order, OrderStatus } from '../types/wms';
import { db } from '../lib/db';
import { Building2, Clock, MapPin, Phone, Mail, AlertTriangle, CheckCircle2, ShoppingCart, Plus, X, Building, Users, History, Package, Search, Filter, ChevronRight, Edit2, Trash2 } from 'lucide-react';
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
  
  // Side Drawer state
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [activeTab, setActiveTab] = useState<'INFO' | 'INVENTORY' | 'HISTORY'>('INFO');
  const [expandedOrderHistoryId, setExpandedOrderHistoryId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BRANCH' | 'CUSTOMER'>('ALL');
  
  // Form states for creating/editing
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<BranchType>('BRANCH');
  const [profitPercent, setProfitPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchQuery = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         b.phone.includes(searchQuery) ||
                         b.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || b.type === filterType;
      return matchQuery && matchType;
    });
  }, [branches, searchQuery, filterType]);

  const openModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setName(branch.name);
      setLocation(branch.location);
      setContactPerson(branch.contactPerson);
      setPhone(branch.phone);
      setType(branch.type);
      setProfitPercent(branch.profitPercent || 0);
    } else {
      setEditingBranch(null);
      setName('');
      setLocation('');
      setContactPerson('');
      setPhone('');
      setType('BRANCH');
      setProfitPercent(0);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleAdjustInventory = async (branchId: string, productId: string, quantityToDeduct: number, type: 'SALE' | 'RETURN') => {
    try {
      await api.adjustBranchInventory(branchId, { productId, quantityToDeduct, type });
      onRefresh();
      // Update selectedBranch locally to reflect changes in drawer without closing it
      const updatedBranch = branches.find(b => b.id === branchId);
      if(updatedBranch) setSelectedBranch(updatedBranch); 
      toast.success('Амжилттай хасагдлаа');
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, { name, location, contactPerson, phone, type, profitPercent });
        if (selectedBranch?.id === editingBranch.id) {
            // refresh branch info in drawer will happen through onRefresh
        }
      } else {
        await api.addBranch({ name, location, contactPerson, phone, type, profitPercent });
      }
      onRefresh();
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ салбар/харилцагчийг устгах уу? (Зөөлөн устгал)')) return;
    try {
      await db.deactivateBranch(id);
      onRefresh();
      if(selectedBranch?.id === id) setSelectedBranch(null);
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
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
      toast.success(`${branch.name} салбартай холбогдох даалгавар үүсгэлээ.`);
    } catch (err) {
      console.error(err);
      toast.success('Даалгавар үүсгэхэд алдаа гарлаа');
    }
  };

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

        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-bold hidden md:inline-block">
            Идэвхгүй: {inactiveAlerts.length}
          </span>
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Шинээр нэмэх
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Салбар, утас, хаягаар хайх..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full sm:w-48 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
          >
            <option value="ALL">Бүх төрөл</option>
            <option value="BRANCH">Дотоод салбар</option>
            <option value="CUSTOMER">Харилцагч</option>
          </select>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBranches.map((b) => {
          const isInactive = inactiveAlerts.some((alert) => alert.branchId === b.id);
          const alertInfo = inactiveAlerts.find((alert) => alert.branchId === b.id);
          const isCustomer = b.type === 'CUSTOMER';
          
          const inventory = b.inventory || [];
          const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * Number((item as any).product?.unitPrice || 0)), 0);

          return (
            <div
              key={b.id}
              onClick={() => {
                setSelectedBranch(b);
                setActiveTab('INFO');
              }}
              className={`bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md cursor-pointer transition-all ${
                isInactive ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                    {isCustomer ? <Users className="w-4 h-4 text-purple-600 shrink-0" /> : <Building className="w-4 h-4 text-blue-600 shrink-0" />}
                    {b.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{b.location}</p>
                </div>
                {isInactive && (
                  <span className="shrink-0 p-1 bg-amber-100 text-amber-700 rounded-md" title={`${alertInfo?.daysInactive} хоног идэвхгүй`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              
              <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-auto">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Үлдэгдэл</div>
                  <div className="text-sm font-bold text-slate-800">₮{totalValue.toLocaleString()}</div>
                </div>
                <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1 group">
                  Дэлгэрэнгүй <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
        {filteredBranches.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            Хайлтад тохирох салбар олдсонгүй.
          </div>
        )}
      </div>

      {/* Side Drawer */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setSelectedBranch(null)}
          ></div>
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {selectedBranch.type === 'CUSTOMER' ? <Users className="w-5 h-5 text-purple-600" /> : <Building className="w-5 h-5 text-blue-600" />}
                  {selectedBranch.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    selectedBranch.type === 'CUSTOMER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedBranch.type === 'CUSTOMER' ? 'Харилцагч' : 'Дотоод салбар'}
                  </span>
                  {(selectedBranch.profitPercent !== undefined && selectedBranch.profitPercent > 0) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Ашиг: {selectedBranch.profitPercent}%
                    </span>
                  )}

                </div>
              </div>
              <button 
                onClick={() => setSelectedBranch(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-6 px-5 border-b border-slate-200 shrink-0">
              {(['INFO', 'INVENTORY', 'HISTORY'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'INFO' ? 'Ерөнхий мэдээлэл' : tab === 'INVENTORY' ? 'Агуулахын үлдэгдэл' : 'Захиалгын түүх'}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-white">
              
              {/* TAB 1: INFO */}
              {activeTab === 'INFO' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Менежер</div>
                      <div className="text-sm font-bold text-slate-800">{selectedBranch.contactPerson}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> {selectedBranch.phone}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Хаяг байршил</div>
                      <div className="text-sm font-semibold text-slate-800 flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
                        {selectedBranch.location}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> Сүүлийн идэвх
                      </div>
                      <p className="text-xs text-amber-700 mt-1">
                        {new Date(selectedBranch.lastActivityAt).toLocaleString('mn-MN')}
                      </p>
                    </div>
                    {inactiveAlerts.some(a => a.branchId === selectedBranch.id) && isAdmin && (
                      <button
                        onClick={() => handleCreateContactTask(selectedBranch, inactiveAlerts.find(a => a.branchId === selectedBranch.id)?.daysInactive || 0)}
                        className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors"
                      >
                        Холбогдох даалгавар
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="pt-6 border-t border-slate-100 flex items-center gap-3">
                      <button 
                        onClick={() => openModal(selectedBranch)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Засах
                      </button>
                      <button 
                        onClick={() => handleDelete(selectedBranch.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Устгах
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVENTORY */}
              {activeTab === 'INVENTORY' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500">Нийт барааны дүн</div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        ₮{(selectedBranch.inventory || []).reduce((s, i) => s + (i.quantity * Number((i as any).product?.unitPrice || 0)), 0).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                          setSelectedBranch(null); // close drawer before navigating if needed
                          onQuickOrder(selectedBranch.id);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <ShoppingCart className="w-4 h-4" /> Шинэ захиалга
                    </button>
                  </div>

                  {(!selectedBranch.inventory || selectedBranch.inventory.length === 0) ? (
                     <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        Үлдэгдэл алга байна.
                     </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-bold text-[11px] uppercase">Бараа</th>
                            <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Үлдэгдэл</th>
                            <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нийт үнэ</th>
                            {(isAdmin || currentUser.role === 'WAREHOUSE_WORKER') && (
                              <th className="px-4 py-3 font-bold text-[11px] uppercase text-center">Үйлдэл</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedBranch.inventory.map((item) => {
                            const product = (item as any).product;
                            const isLow = item.quantity > 0 && item.quantity < 5;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-slate-900">{product?.name}</div>
                                  <div className="text-xs text-slate-500">{product?.sku}</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex items-center font-bold ${isLow ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded-md' : 'text-slate-800'}`}>
                                    {item.quantity} ш
                                    {isLow && <AlertTriangle className="w-3.5 h-3.5 ml-1" />}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                                  ₮{(item.quantity * Number(product?.unitPrice || 0)).toLocaleString()}
                                </td>
                                {(isAdmin || currentUser.role === 'WAREHOUSE_WORKER') && (
                                  <td className="px-4 py-3 text-center">
                                    {item.quantity > 0 && (
                                      <div className="flex justify-center gap-1">
                                        <button 
                                          onClick={() => {
                                            const q = prompt(`Зарлагадах тоо (дээд тал нь ${item.quantity}):`);
                                            if (q && !isNaN(Number(q)) && Number(q) > 0 && Number(q) <= item.quantity) {
                                              handleAdjustInventory(selectedBranch.id, item.productId, Number(q), 'SALE');
                                            }
                                          }} 
                                          className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1.5 rounded-md hover:bg-emerald-200 transition-colors"
                                        >
                                          Зарлага
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const q = prompt(`Буцаах тоо (дээд тал нь ${item.quantity}):`);
                                            if (q && !isNaN(Number(q)) && Number(q) > 0 && Number(q) <= item.quantity) {
                                              handleAdjustInventory(selectedBranch.id, item.productId, Number(q), 'RETURN');
                                            }
                                          }} 
                                          className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1.5 rounded-md hover:bg-amber-200 transition-colors"
                                        >
                                          Буцаалт
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HISTORY */}
              {activeTab === 'HISTORY' && (
                <div>
                  {(() => {
                    const branchOrders = orders.filter((o) => o.branchId === selectedBranch.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    
                    if (branchOrders.length === 0) {
                      return (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                          <div className="w-12 h-12 bg-white text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <History className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-700 mb-1">Захиалга алга байна</h4>
                          <p className="text-xs text-slate-500">Одоогоор захиалга бүртгэгдээгүй байна.</p>
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
                            <div key={order.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:border-slate-300">
                              <div 
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
                                onClick={() => setExpandedOrderHistoryId(isExpanded ? null : order.id)}
                              >
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-900">{order.orderNumber}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColors[order.status]}`}>
                                      {order.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(order.createdAt).toLocaleString('mn-MN')}
                                    <span>•</span> Үүсгэсэн: {order.createdByName}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] uppercase font-bold text-slate-400">Нийт дүн</div>
                                  <div className="text-sm font-bold text-slate-800 font-mono">₮{order.totalAmount.toLocaleString()}</div>
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50 p-4">
                                  <h5 className="text-[11px] uppercase font-bold text-slate-500 mb-2">Бараанууд ({order.items.length})</h5>
                                  <div className="space-y-1.5">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2 rounded-lg">
                                        <div>
                                          <div className="text-xs font-semibold text-slate-800">{item.productName}</div>
                                          <div className="text-[10px] text-slate-500">{item.sku} | ₮{item.unitPrice.toLocaleString()}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs font-bold text-blue-600">{item.quantity} ш</div>
                                          <div className="text-[11px] font-bold text-slate-700 font-mono">₮{item.totalPrice.toLocaleString()}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {order.deliveredAt && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Хүргэгдсэн: {new Date(order.deliveredAt).toLocaleString('mn-MN')} ({order.deliveredByName})
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (For Create/Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
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

                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ашгийн хувь (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profitPercent}
                    onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                    placeholder="Жишээ нь: 15"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Өртгөөс нэмэгдэх ашиг</p>
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

                <div className="col-span-2 sm:col-span-1">
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
