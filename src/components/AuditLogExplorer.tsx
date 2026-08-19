import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderHistory, Role, Product, OrderStatusConfig, Branch, User as UserModel } from '../types/wms';
import { api } from '../lib/api';
import { History, Search, Filter, User, Clock, Package, ChevronDown, ChevronUp, ChevronRight, Activity, CalendarDays, Building2, Eye } from 'lucide-react';

interface AuditLogExplorerProps {
  products: Product[];
}

interface OrderWithHistory extends Order {
  branch?: { name: string };
  history: (OrderHistory & { changedBy?: { name: string, role: Role } })[];
}

export const AuditLogExplorer: React.FC<AuditLogExplorerProps> = ({ products }) => {
  const [orders, setOrders] = useState<OrderWithHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [page, setPage] = useState(1);
  const limit = 20;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusConfig[]>([]);

  // Expand state
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      api.getBranches().catch(() => []),
      api.getUsers().catch(() => []),
      api.getOrderStatuses().catch(() => [])
    ]).then(([b, u, s]) => {
      setBranches(b);
      setUsers(u);
      setOrderStatuses(s);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAuditData = () => {
    setIsLoading(true);
    api.getAuditOrders({
      page,
      limit,
      branchId,
      userId,
      status,
      startDate,
      endDate,
      search: debouncedSearch
    })
    .then((res) => {
      setOrders(res.data || []);
      setTotal(res.total || 0);
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAuditData();
  }, [page, limit, branchId, userId, status, startDate, endDate, debouncedSearch]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const getStatusBadge = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.colorClass : 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const getStatusLabel = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.label : code;
  };

  const roleTranslations: Record<string, string> = {
    ADMIN: 'Админ',
    WAREHOUSE_WORKER: 'Агуулахын ажилтан',
    DELIVERY_DRIVER: 'Жолооч',
    FINANCE: 'Санхүү',
    PRODUCTION: 'Үйлдвэрлэл',
    DATA_ADMIN: 'Өгөгдлийн админ',
  };

  const roleBadges: Record<string, string> = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    WAREHOUSE_WORKER: 'bg-blue-50 text-blue-700 border-blue-200',
    DELIVERY_DRIVER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FINANCE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    PRODUCTION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DATA_ADMIN: 'bg-red-50 text-red-700 border-red-200',
  };

  const getDiff = (prevJson: string | null, currJson: string) => {
    try {
      const prev = prevJson ? JSON.parse(prevJson) : [];
      const curr = currJson ? JSON.parse(currJson) : [];
      const prevMap = new Map(prev.map((i: any) => [i.sku, i.qty || i.quantity]));
      const currMap = new Map(curr.map((i: any) => [i.sku, i.qty || i.quantity]));
      
      const changes: { sku: string, oldQty: number, newQty: number }[] = [];
      
      prevMap.forEach((oldQty, sku) => {
        const newQty = currMap.get(sku as string) || 0;
        if (oldQty !== newQty) changes.push({ sku: sku as string, oldQty: oldQty as number, newQty: newQty as number });
      });
      
      currMap.forEach((newQty, sku) => {
        if (!prevMap.has(sku as string)) changes.push({ sku: sku as string, oldQty: 0, newQty: newQty as number });
      });
      
      return changes;
    } catch (e) {
      return [];
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Аудит & Гүйлгээний түүх
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Захиалгуудын хувьсал, төлөвийн шилжилт болон агуулахын үлдэгдлийн өөрчлөлтүүд
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          Нийт захиалга: {total}
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="col-span-1 sm:col-span-2 md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Хайлт</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Захиалгын №..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Салбар</label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Бүх салбар</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Хэрэглэгч</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Бүх хэрэглэгч</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Төлөв</label>
          <div className="relative">
            <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Бүх төлөв</option>
              {orderStatuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Хугацаа</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[11px] focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[11px] focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Түүхийг уншиж байна...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            Хайлтад тохирох үр дүн олдсонгүй.
          </div>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
                {/* Order Header / Accordion Toggle */}
                <div 
                  onClick={() => toggleExpand(order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0`}>
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono text-sm">{order.orderNumber}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {order.branch?.name || 'Тодорхойгүй салбар'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${getStatusBadge(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        {order.history.length} үйлдэл
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-[11px] text-slate-500 font-mono text-right hidden sm:block">
                      Сүүлд шинэчлэгдсэн:<br/>
                      {new Date(order.updatedAt).toLocaleString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-8">
                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                      {order.history.map((log, index) => {
                        // Because history is desc, the "previous" state is the *next* item in the array.
                        const prevLog = index < order.history.length - 1 ? order.history[index + 1] : null;
                        const changes = getDiff(prevLog ? prevLog.itemsSnapshot : null, log.itemsSnapshot);

                        const roleText = log.changedBy?.role || 'SYSTEM';
                        const roleBadgeClass = roleBadges[roleText] || 'bg-slate-50 text-slate-700';

                        return (
                          <div key={log.id} className="relative pl-8">
                            {/* Node Dot */}
                            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm" />
                            
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                              {/* Log Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getStatusBadge(log.status)}`}>
                                    {getStatusLabel(log.status)}
                                  </span>
                                  {log.notes && (
                                    <span className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                                      "{log.notes}"
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {new Date(log.createdAt).toLocaleString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </div>

                              {/* User Info */}
                              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                  <User className="w-3 h-3 text-slate-500" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">{log.changedBy?.name || 'Систем'}</div>
                                  <div className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${roleBadgeClass}`}>
                                    {roleTranslations[roleText] || roleText}
                                  </div>
                                </div>
                              </div>

                              {/* Diff Info */}
                              {changes.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Барааны өөрчлөлт:</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {changes.map((c, i) => {
                                      const p = products.find(prod => prod.sku === c.sku);
                                      const isAdd = c.newQty > c.oldQty;
                                      const isRemove = c.newQty < c.oldQty;
                                      return (
                                        <div key={i} className={`flex items-center justify-between p-2 rounded-xl border text-xs font-mono ${
                                          isAdd ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
                                          isRemove ? 'bg-rose-50 border-rose-100 text-rose-900' :
                                          'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}>
                                          <div className="flex items-center gap-2 truncate">
                                            <Package className={`w-3.5 h-3.5 shrink-0 ${isAdd ? 'text-emerald-500' : 'text-rose-500'}`} />
                                            <span className="truncate">{p?.name || c.sku}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0 ml-2 font-bold">
                                            {c.oldQty > 0 && <span className="line-through opacity-60">{c.oldQty}</span>}
                                            {c.oldQty > 0 && <ChevronRight className="w-3 h-3 opacity-60" />}
                                            <span className={isAdd ? 'text-emerald-700' : 'text-rose-700'}>{c.newQty}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 italic">Бараанд өөрчлөлт ороогүй</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {order.history.length === 0 && (
                        <div className="pl-8 text-xs text-slate-500">Түүх бүртгэгдээгүй байна.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-xs text-slate-500 font-medium">
            Нийт <span className="font-bold text-slate-900">{total}</span>-н <span className="font-bold text-slate-900">{(page - 1) * limit + 1} - {Math.min(page * limit, total)}</span>
          </div>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Өмнөх
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Дараах
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
