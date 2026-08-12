import React, { useState, useMemo, useEffect } from 'react';
import { Order, Product, Branch, InactiveBranchAlert, User, OrderStatus, OrderStatusConfig } from '../types/wms';
import { api } from '../lib/api';
import { InactiveBranchAlertComponent } from './InactiveBranchAlert';
import { Package, ShoppingCart, Truck, Building2, AlertTriangle, ArrowUpRight, TrendingUp, ShieldCheck, DollarSign, BarChart3, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  branches: Branch[];
  inactiveAlerts: InactiveBranchAlert[];
  currentUser: User;
  onNavigateTab: (tab: string) => void;
  onOpenDeliveryModal: (order: Order) => void;
  onQuickOrder: (branchId: string) => void;
  onSimulateActivity: (branchId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  products,
  branches,
  inactiveAlerts,
  currentUser,
  onNavigateTab,
  onOpenDeliveryModal,
  onQuickOrder,
  onSimulateActivity,
}) => {
  // Date Range State
  const [dateRange, setDateRange] = useState<'30days' | 'thisMonth' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Forecast Data
  const [forecastData, setForecastData] = useState<any[]>([]);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await api.getForecast();
        setForecastData(res);
      } catch (err) {
        console.error('Failed to load forecast', err);
      }
    };
    fetchForecast();
  }, []);

  // Derived Dates
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    let start = new Date(0); // All time
    if (dateRange === '30days') {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'thisMonth') {
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'custom') {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      
      const customEnd = new Date(customEndDate);
      customEnd.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: customEnd };
    }
    
    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.createdAt).getTime();
      return d >= startDate.getTime() && d <= endDate.getTime();
    });
  }, [orders, startDate, endDate]);

  // Metrics
  const totalOrdersCount = filteredOrders.length;
  const pendingOrdersCount = filteredOrders.filter((o) => o.status === 'PENDING' || o.status === 'PACKED' || o.status === 'IN_TRANSIT').length;
  const deliveredOrdersCount = filteredOrders.filter((o) => o.status === 'DELIVERED').length;

  const totalFulfilledRevenue = filteredOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalMarginProfit = filteredOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + (o.marginProfit || 0), 0);

  const lowStockProducts = products.filter((p) => p.stockQuantity <= 10);
  const criticalStockProducts = products.filter((p) => p.stockQuantity <= 3);

  // Dynamic Chart Data
  const chartData = React.useMemo(() => {
    // Determine if we should group by month (> 60 days) or day
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isMonthly = diffDays > 60 || startDate.getTime() === 0;

    const dataMap = new Map<string, { label: string, total: number, delivered: number, revenue: number, sortKey: string }>();

    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt);
      let key = '';
      let label = '';
      let sortKey = '';

      if (isMonthly) {
        key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        label = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        sortKey = label;
      } else {
        key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        label = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
        sortKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, { label, total: 0, delivered: 0, revenue: 0, sortKey });
      }
      const entry = dataMap.get(key)!;
      entry.total += 1;
      if (o.status === 'DELIVERED') {
        entry.delivered += 1;
        entry.revenue += o.totalAmount;
      }
    });

    const result = Array.from(dataMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return result.map(r => ({
      shortDate: r.label,
      'Нийт захиалга': r.total,
      'Хүргэгдсэн': r.delivered,
      'Нийт дүн (₮)': Math.round(r.revenue),
    }));
  }, [filteredOrders, startDate, endDate]);

  const chartTotalOrders = chartData.reduce((sum, d) => sum + d['Нийт захиалга'], 0);
  const chartTotalRevenue = chartData.reduce((sum, d) => sum + d['Нийт дүн (₮)'], 0);

  const recentOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  // Status Badge Styling
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusConfig[]>([]);
  useEffect(() => {
    api.getOrderStatuses().then(setOrderStatuses).catch(console.error);
  }, []);

  const getStatusBadge = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.colorClass : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStatusLabel = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.label : code;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <InactiveBranchAlertComponent
        alerts={inactiveAlerts}
        onQuickOrder={onQuickOrder}
        onSimulateActivity={onSimulateActivity}
        userRole={currentUser.role}
      />

            {/* Date Range Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Хугацаагаар шүүх</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors hover:bg-slate-100"
          >
            <option value="30days">Сүүлийн 30 хоног</option>
            <option value="thisMonth">Энэ сар</option>
            <option value="all">Бүх хугацаа (All time)</option>
            <option value="custom">Дурын хугацаа сонгох</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Demand Forecast Widget */}
      {forecastData.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-indigo-400" /> Урьдчилсан таамаглал (Дараагийн 7 хоног)
            </h3>
            <p className="text-indigo-200 text-sm mb-6 max-w-2xl">
              Өнгөрсөн 30 хоногийн борлуулалтын хурдад суурилан дараагийн 7 хоногт шаардагдах барааны тооцоолол.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {forecastData.slice(0, 4).map((f, i) => (
                <div key={f.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1 line-clamp-1">
                    {f.name}
                  </div>
                  <div className="text-3xl font-black text-white mb-2">{f.forecast7Days} <span className="text-sm font-normal text-indigo-300">ш</span></div>
                  <div className="text-[10px] text-indigo-300">
                    Өдөрт дунджаар {f.dailyAverage} зарагддаг
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Нийт захиалга</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalOrdersCount}</span>
            <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {pendingOrdersCount} Боловсруулагдаж байна
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Салбаруудаас ирсэн нийт хүсэлтүүд</p>
        </div>

        {/* Fulfilled Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Хүргэгдсэн борлуулалт</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalFulfilledRevenue.toLocaleString()}₮
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {deliveredOrdersCount} Хүргэгдсэн
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Агуулахын нөөцөөс автомат хасагдсан</p>
        </div>

        {/* Margin Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Цэвэр ашиг (Margin)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalMarginProfit.toLocaleString()}₮
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Салбаруудын нэмэгдэл үнээс олсон</p>
        </div>

        {/* Low Stock Alert Count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Үлдэгдэл багатай</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{lowStockProducts.length} SKU</span>
            {criticalStockProducts.length > 0 && (
              <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 font-bold">
                {criticalStockProducts.length} Нэн яаралтай
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Дахин татан авалт хийх шаардлагатай</p>
        </div>

        {/* Branch Health Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Салбаруудын эрүүл мэнд</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{branches.length} Салбар</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
              inactiveAlerts.length > 0
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}>
              {inactiveAlerts.length > 0 ? `${inactiveAlerts.length} Идэвхгүй` : '100% Идэвхтэй'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">7 хоногийн идэвхийн дүрмийн хяналт</p>
        </div>
      </div>

      {/* 7-DAY ORDER VOLUME BAR CHART */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Захиалгын график харьцуулалт
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Сонгосон хугацаан дахь өдөр/сарын захиалгын харьцуулалт
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Нийт шүүгдсэн: <strong className="text-blue-700">{chartTotalOrders} захиалга</strong> ({chartTotalRevenue.toLocaleString()}₮)
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="shortDate"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px', fontWeight: 600 }}
              />
              <Bar
                dataKey="Нийт захиалга"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="Хүргэгдсэн"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Сүүлийн захиалгууд
            </h3>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Бүгдийг харах ({filteredOrders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider font-semibold border-y border-slate-200">
                <tr>
                  <th className="p-3">Захиалга №</th>
                  <th className="p-3">Салбар</th>
                  <th className="p-3 text-right">Дүн</th>
                  <th className="p-3 text-center">Төлөв</th>
                  <th className="p-3 text-center">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600">{ord.orderNumber}</td>
                    <td className="p-3 text-slate-900 font-medium">{ord.branchName}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {ord.totalAmount.toLocaleString()}₮
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(ord.status)}`}>
                        {getStatusLabel(ord.status)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onOpenDeliveryModal(ord)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        Дэлгэрэнгүй
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warnings Sidebar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Үлдэгдэл багассан бараа
              </h3>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                Нэмж татах
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {lowStockProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Бүх барааны агуулахын үлдэгдэл хангалттай байна.
                </div>
              ) : (
                lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] font-mono text-blue-600">{p.sku}</div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-700 block">
                        {p.stockQuantity} ширхэг
                      </span>
                      <span className="text-[10px] text-slate-500">{p.unitPrice.toLocaleString()}₮</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 flex items-start gap-2 mt-4">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Автомат хамгаалалт:</strong> Хүргэлтийн жолооч захиалга баталгаажуулахад агуулахын үлдэгдэл хүрэлцэхгүй бол автоматаар сэрэмжлүүлэг өгнө.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

