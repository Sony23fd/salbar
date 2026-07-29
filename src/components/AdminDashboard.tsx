import React from 'react';
import { Order, Product, Branch, InactiveBranchAlert, User, OrderStatus } from '../types/wms';
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
  // Metrics
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING' || o.status === 'PACKED' || o.status === 'IN_TRANSIT').length;
  const deliveredOrdersCount = orders.filter((o) => o.status === 'DELIVERED').length;

  const totalFulfilledRevenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const lowStockProducts = products.filter((p) => p.stockQuantity <= 10);
  const criticalStockProducts = products.filter((p) => p.stockQuantity <= 3);

  // 7-Day Order Volume Chart Data
  const last7DaysData = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const date = d.getDate();

      const dayOrders = orders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return (
          oDate.getFullYear() === year &&
          oDate.getMonth() === month &&
          oDate.getDate() === date
        );
      });

      const shortMonth = d.getMonth() + 1;
      const shortDay = d.getDate();
      const shortDate = `${shortMonth}/${shortDay}`;

      const totalCount = dayOrders.length;
      const deliveredCount = dayOrders.filter((o) => o.status === 'DELIVERED').length;
      const totalAmount = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      days.push({
        shortDate,
        'Нийт захиалга': totalCount,
        'Хүргэгдсэн': deliveredCount,
        'Нийт дүн (₮)': Math.round(totalAmount),
      });
    }
    return days;
  }, [orders]);

  const last7DaysTotalOrders = last7DaysData.reduce((sum, d) => sum + d['Нийт захиалга'], 0);
  const last7DaysTotalRevenue = last7DaysData.reduce((sum, d) => sum + d['Нийт дүн (₮)'], 0);

  const recentOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const statusTranslations: Record<OrderStatus, string> = {
    PENDING: 'Хүлээгдэж буй',
    PROCESSING: 'Боловсруулж буй',
    PACKED: 'Савлагдсан',
    IN_TRANSIT: 'Тээвэрлэлтэд',
    DELIVERED: 'Хүргэгдсэн',
    CANCELLED: 'Цуцлагдсан',
  };

  const statusBadges: Record<OrderStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
    PACKED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    IN_TRANSIT: 'bg-purple-100 text-purple-800 border-purple-200',
    DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="space-y-6">
      {/* 1. 7-DAY INACTIVE BRANCH WARNING ALERT BANNER */}
      <InactiveBranchAlertComponent
        alerts={inactiveAlerts}
        onQuickOrder={onQuickOrder}
        onSimulateActivity={onSimulateActivity}
        userRole={currentUser.role}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Сүүлийн 7 хоногийн захиалгын хэмжээ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Салбаруудаас өдөр тутам ирсэн ба хүргэгдсэн захиалгын тооны харьцуулалт
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Сүүлийн 7 хоногт: <strong className="text-blue-700">{last7DaysTotalOrders} захиалга</strong> ({last7DaysTotalRevenue.toLocaleString()}₮)
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={last7DaysData}
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
              Бүгдийг харах ({orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
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
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${statusBadges[ord.status]}`}>
                        {statusTranslations[ord.status]}
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

