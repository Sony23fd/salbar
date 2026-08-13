import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Order, Branch, Product, User, OrderStatus, OrderStatusConfig } from '../types/wms';
import { createOrder } from '../actions/order';
import { db } from '../lib/db';
import { ShoppingCart, Plus, Search, Filter, Truck, CheckCircle2, AlertTriangle, ShieldAlert, Clock, ChevronRight, Package, MapPin, X, Trash2, Settings, History, Printer } from 'lucide-react';
import { OrderStatusSettingsModal } from './OrderStatusSettingsModal';
import { api } from '../lib/api';

interface OrderManagerProps {
  orders: Order[];
  branches: Branch[];
  products: Product[];
  currentUser: User[];
  activeUser: User;
  onOpenDeliveryModal: (order: Order) => void;
  onRefresh: () => void;
  presetBranchId?: string;
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  branches,
  products,
  currentUser,
  activeUser,
  onOpenDeliveryModal,
  onRefresh,
  presetBranchId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(!!presetBranchId);

  // New Order Form state
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    presetBranchId || branches[0]?.id || ''
  );
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id || '', quantity: 1 },
  ]);
  const [notes, setNotes] = useState('');
  
  // Barcode Scanner State
  const [autoScanMode, setAutoScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Status Modal state
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [adminStatus, setAdminStatus] = useState<OrderStatus>('PENDING');
  const [adminNotes, setAdminNotes] = useState('');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  // Dynamic Statuses
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusConfig[]>([]);
  const [showStatusSettings, setShowStatusSettings] = useState(false);

  React.useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const data = await api.getOrderStatuses();
        setOrderStatuses(data);
      } catch (err) {
        console.error('Failed to load order statuses', err);
      }
    };
    fetchStatuses();
  }, []);

  // Barcode Scanner Listener
  React.useEffect(() => {
    if (!autoScanMode || !showCreateModal) {
      setBarcodeInput('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (except if we want to force it)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'Enter') {
        if (barcodeInput.trim()) {
          // Process barcode
          const scannedSku = barcodeInput.trim();
          const product = products.find(p => p.sku === scannedSku || p.sku.toLowerCase() === scannedSku.toLowerCase());
          
          if (product) {
            setOrderItems(prev => {
              const existingItemIndex = prev.findIndex(item => item.productId === product.id);
              if (existingItemIndex >= 0) {
                const newItems = [...prev];
                newItems[existingItemIndex].quantity += 1;
                return newItems;
              } else {
                // Find empty row or add new
                const emptyIndex = prev.findIndex(item => !item.productId);
                if (emptyIndex >= 0) {
                  const newItems = [...prev];
                  newItems[emptyIndex] = { productId: product.id, quantity: 1 };
                  return newItems;
                }
                return [...prev, { productId: product.id, quantity: 1 }];
              }
            });
            toast.success(`${product.name} нэмэгдлээ!`, { id: 'barcode-success' });
          } else {
            toast.error(`Бараа олдсонгүй: ${scannedSku}`, { id: 'barcode-error' });
          }
        }
        setBarcodeInput(''); // Reset after enter
      } else if (e.key.length === 1) { // Normal character
        setBarcodeInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoScanMode, showCreateModal, barcodeInput, products]);

  const getStatusBadge = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.colorClass : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStatusLabel = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.label : code;
  };

  // Filter Orders
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.branchName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || ord.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || ord.branchId === branchFilter;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Calculate live total price for order creation modal
  const liveTotalAmount = orderItems.reduce((sum, item) => {
    const p = products.find((prod) => prod.id === item.productId);
    return sum + (p ? p.unitPrice * item.quantity : 0);
  }, 0);

  const handleAddItemRow = () => {
    const unusedProd = products.find((p) => !orderItems.some((i) => i.productId === p.id));
    setOrderItems([...orderItems, { productId: unusedProd?.id || products[0]?.id || '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: any) => {
    const copy = [...orderItems];
    copy[index] = { ...copy[index], [field]: value };
    setOrderItems(copy);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    ;
    ;
    setIsSubmitting(true);

    try {
      const response = await createOrder(
        {
          branchId: selectedBranchId,
          items: orderItems.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
          notes,
        },
        activeUser.id,
        activeUser.role
      );

      if (!response.success) {
        toast.error(response.message);
      } else {
        toast.success('Захиалга амжилттай үүсэгдлээ!');
        setTimeout(() => {
          setShowCreateModal(false);
          setOrderItems([{ productId: products[0]?.id || '', quantity: 1 }]);
          setNotes('');
          ;
          onRefresh();
        }, 1200);
      }
    } catch (err: any) {
      toast.error(err.message || 'Захиалга үүсгэхэд алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await db.changeOrderStatus(orderId, nextStatus, activeUser.id, `Төлөв шинэчлэгдсэн: ${nextStatus}`);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Алдаа гарлаа');
    }
  };

  const handleAdminStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;
    setIsAdminSubmitting(true);
    try {
      await db.changeOrderStatus(statusModalOrder.id, adminStatus, activeUser.id, adminNotes);
      setStatusModalOrder(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Төлөв өөрчлөх үед алдаа гарлаа.');
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const canCreate = activeUser.role === 'ADMIN' || activeUser.role === 'WAREHOUSE_WORKER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Салбаруудын захиалгын удирдлага
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Салбаруудаас ирсэн захиалгыг боловсруулах, агуулахаас бэлтгэх ба хүргэлтэд шилжүүлэх
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Шинэ захиалга үүсгэх
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 hide-scrollbar">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Бүгд <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'ALL' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{orders.length}</span>
            </button>
            
            {orderStatuses.map((statusObj) => {
              const count = orders.filter((o) => o.status === statusObj.code).length;
              const isActive = statusFilter === statusObj.code;
              
              return (
                <button
                  key={statusObj.code}
                  onClick={() => setStatusFilter(statusObj.code)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {statusObj.label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-blue-50 text-blue-600 font-extrabold'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {activeUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowStatusSettings(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0 shadow-sm"
              title="Төлөвийн тохиргоо"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search & Branch Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Захиалгын № эсвэл салбарын нэрээр хайх..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs font-medium"
            >
              <option value="ALL">Бүх салбар</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            Хайлтад тохирох захиалга олдсонгүй.
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const createdDate = new Date(ord.createdAt).toLocaleString('mn-MN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={ord.id}
                className={`bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all space-y-4 shadow-xs ${ord.status === 'CANCELLED' ? 'opacity-60 grayscale-[50%]' : ''}`}
              >
                {/* Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      {ord.orderNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(ord.status)}`}>
                      {getStatusLabel(ord.status)}
                    </span>
                  </div>

                  <div className="text-right text-xs flex flex-col items-end gap-1">
                    <div className="font-extrabold text-slate-900 text-sm font-mono">{ord.totalAmount.toLocaleString()}₮</div>
                    <div className="text-slate-500 text-[11px]">{createdDate}</div>
                    
                    <button
                      onClick={() => {
                        // Print Logic
                        const printContent = `
                          <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                            <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">ЗАРЛАГЫН ПАДААН</h2>
                            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                              <div>
                                <strong>Захиалгын №:</strong> ${ord.orderNumber}<br/>
                                <strong>Огноо:</strong> ${createdDate}
                              </div>
                              <div style="text-align: right;">
                                <strong>Салбар:</strong> ${ord.branchName}<br/>
                                <strong>Хаяг:</strong> ${ord.branchLocation}
                              </div>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                              <thead>
                                <tr style="background: #f1f1f1;">
                                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Барааны нэр</th>
                                  <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Тоо ширхэг</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${ord.items.map(item => `
                                  <tr>
                                    <td style="border: 1px solid #ccc; padding: 8px;">${item.productName}</td>
                                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${item.quantity}</td>
                                  </tr>
                                `).join('')}
                              </tbody>
                            </table>
                            <div style="margin-top: 20px; text-align: right; font-size: 18px;">
                              <strong>Нийт дүн:</strong> ${ord.totalAmount.toLocaleString()}₮
                            </div>
                            <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                              <div>
                                <strong>Хүлээлгэн өгсөн:</strong> .....................................<br/>
                                <span style="font-size: 12px; color: #666;">(Гарын үсэг)</span>
                              </div>
                              <div>
                                <strong>Хүлээн авсан:</strong> .....................................<br/>
                                <span style="font-size: 12px; color: #666;">(Гарын үсэг)</span>
                              </div>
                            </div>
                          </div>
                        `;
                        const printWindow = window.open('', '', 'width=800,height=600');
                        if (printWindow) {
                          printWindow.document.write(printContent);
                          printWindow.document.close();
                          printWindow.focus();
                          setTimeout(() => {
                            printWindow.print();
                            printWindow.close();
                          }, 250);
                        }
                      }}
                      className="mt-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Падаан хэвлэх"
                    >
                      <Printer className="w-3 h-3" /> Хэвлэх
                    </button>
                  </div>
                </div>

                {/* Branch & Items */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Захиалсан салбар</span>
                    <div className="font-bold text-slate-900 mt-0.5">{ord.branchName}</div>
                    <div className="text-slate-500 flex items-center gap-1 mt-0.5 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {ord.branchLocation}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Захиалсан бараанууд</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ord.items.map((item) => (
                        <span
                          key={item.id}
                          className="bg-slate-50 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5 font-medium"
                        >
                          <Package className="w-3.5 h-3.5 text-blue-600" />
                          <span>{item.productName}</span>
                          <strong className="text-blue-700 font-mono">x{item.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Progression Bar & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    Үүсгэсэн: <strong className="text-slate-800">{ord.createdByName}</strong>
                    {ord.deliveredByName && (
                      <span className="ml-2">
                        • Хүргэсэн: <strong className="text-emerald-700">{ord.deliveredByName}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Advance Buttons for Worker / Admin */}
                    {canCreate && ord.status === 'PENDING' && (
                      <button
                        onClick={() => handleAdvanceStatus(ord.id, 'PACKED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                      >
                        Савлагдсан гэж тэмдэглэх
                      </button>
                    )}

                    {canCreate && ord.status === 'PACKED' && (
                      <button
                        onClick={() => handleAdvanceStatus(ord.id, 'IN_TRANSIT')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                      >
                        Тээвэрлэлтэд гаргах
                      </button>
                    )}

                    {/* Deliver Modal Trigger */}
                    <button
                      onClick={() => onOpenDeliveryModal(ord)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                        ord.status === 'DELIVERED'
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      {ord.status === 'DELIVERED' ? 'Хүргэлт & Аудит харах' : 'Хүргэлт баталгаажуулах'}
                    </button>

                    {/* Admin Status Manage */}
                    {activeUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setStatusModalOrder(ord);
                          setAdminStatus(ord.status);
                          setAdminNotes('');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
                        title="Төлөв өөрчлөх"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Admin Status Management */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" /> Төлөв удирдах
              </h3>
              <button onClick={() => setStatusModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminStatusSubmit} className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800 text-xs font-medium flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1 text-amber-900">Анхааруулга:</strong>
                  Төлвийг хүчээр өөрчлөх нь агуулахын үлдэгдэлд шууд нөлөөлөхгүй (Хүргэгдсэнээс бусад тохиолдолд) тул маш анхааралтай хийнэ үү.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Захиалгын төлөв</label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value as OrderStatus)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {orderStatuses.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Тэмдэглэл / Шалтгаан *</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Төлөв албадан өөрчилсөн шалтгаанаа энд бичнэ үү..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-xs text-slate-900 min-h-[80px]"
                  required
                />
              </div>

              {/* Order History (Audit Trail) */}
              {statusModalOrder.history && statusModalOrder.history.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" /> Төлөвийн түүх
                  </h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {statusModalOrder.history.map((hist, idx) => (
                      <div key={idx} className="flex gap-3 text-xs relative">
                        {idx !== statusModalOrder.history!.length - 1 && (
                          <div className="absolute left-1 top-4 bottom-[-12px] w-0.5 bg-slate-100" />
                        )}
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1 relative z-10 shrink-0" />
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-800">{getStatusLabel(hist.status)}</strong>
                            <span className="text-[10px] text-slate-400">
                              {new Date(hist.createdAt).toLocaleString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-slate-500 mt-0.5">{hist.notes}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Үүсгэсэн: {hist.changedByName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={isAdminSubmitting || (adminStatus === statusModalOrder.status && !adminNotes)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                >
                  {isAdminSubmitting ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Branch Requisition */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Салбарын захиалга үүсгэх
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              

              

              {/* Auto Scan Toggle */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <div>
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" /> Баркодоор нэмэх (Auto-Scan)
                  </label>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Идэвхжүүлсэн үед баркод уншигчаар барааг шууд жагсаалтад нэмнэ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoScanMode(!autoScanMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    autoScanMode ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoScanMode ? 'translate-x-2' : '-translate-x-2'
                    }`}
                  />
                </button>
              </div>

              {/* Branch Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Захиалга өгч буй салбар *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — ({b.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-Item Selector Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Захиалах бараанууд & Тоо хэмжээ *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Мөр нэмэх
                  </button>
                </div>

                <div className="space-y-2.5">
                  {orderItems.map((item, idx) => {
                    const selectedProd = products.find((p) => p.id === item.productId);
                    const rowTotal = selectedProd ? selectedProd.unitPrice * item.quantity : 0;

                    return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                            required
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — {p.unitPrice.toLocaleString()}₮ [Үлдэгдэл: {p.stockQuantity}]
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', Math.max(0.1, parseFloat(e.target.value) || 0.1))
                            }
                            placeholder="Тоо"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-center font-mono font-bold"
                            required
                          />
                        </div>

                        <div className="w-28 text-right font-mono font-bold text-slate-900 text-xs">
                          {rowTotal.toLocaleString()}₮
                        </div>

                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Total Footer */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Нийт бодогдсон дүн</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {liveTotalAmount.toLocaleString()} ₮
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Дотоод тэмдэглэл</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="д.г. Яаралтай тээвэрлэх шаардлагатай..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Илгээж байна...' : 'Захиалга илгээх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showStatusSettings && (
        <OrderStatusSettingsModal
          onClose={() => setShowStatusSettings(false)}
          onRefresh={() => {
            api.getOrderStatuses().then(setOrderStatuses);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

