import React from 'react';
import { OrderHistory, Role, OrderStatus, Product, OrderStatusConfig } from '../types/wms';
import { CheckCircle2, Clock, User, Package, ShieldCheck, AlertCircle, Truck, FileText, History } from 'lucide-react';

interface OrderHistoryTimelineProps {
  historyLogs: OrderHistory[];
  currentStatus: string;
  products?: Product[];
  orderStatuses: OrderStatusConfig[];
}

export const OrderHistoryTimeline: React.FC<OrderHistoryTimelineProps> = ({
  historyLogs,
  currentStatus,
  products,
  orderStatuses
}) => {
  const getStatusBadge = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.colorClass : 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const getStatusLabel = (code: string) => {
    const st = orderStatuses.find(s => s.code === code);
    return st ? st.label : code;
  };

  const roleBadges: Record<Role, string> = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    WAREHOUSE_WORKER: 'bg-blue-50 text-blue-700 border-blue-200',
    DELIVERY_DRIVER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FINANCE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    PRODUCTION: 'bg-purple-50 text-purple-700 border-purple-200',
    DATA_ADMIN: 'bg-red-50 text-red-700 border-red-200',
  };

  const roleTranslations: Record<Role, string> = {
    ADMIN: 'Админ',
    WAREHOUSE_WORKER: 'Агуулахын ажилтан',
    DELIVERY_DRIVER: 'Жолооч',
    FINANCE: 'Санхүү',
    PRODUCTION: 'Үйлдвэрлэл',
    DATA_ADMIN: 'Өгөгдлийн админ',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'PROCESSING':
        return <Package className="w-3.5 h-3.5 text-blue-600" />;
      case 'PACKED':
        return <Package className="w-3.5 h-3.5 text-indigo-600" />;
      case 'IN_TRANSIT':
        return <Truck className="w-3.5 h-3.5 text-purple-600" />;
      case 'DELIVERED':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'CANCELLED':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Sort logs chronologically
  const sortedLogs = [...historyLogs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-600" />
          Аудитын түүх & Нийт өөрчлөлт ({sortedLogs.length})
        </h4>
        <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md border ${getStatusBadge(currentStatus)}`}>
          Одоогийн төлөв: {getStatusLabel(currentStatus)}
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {sortedLogs.map((log, idx) => {
          const logDate = new Date(log.createdAt).toLocaleString('mn-MN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          let itemsSnapshotList: any[] = [];
          try {
            itemsSnapshotList = JSON.parse(log.itemsSnapshot || '[]');
          } catch (e) {
            itemsSnapshotList = [];
          }

          return (
            <div key={log.id || idx} className="relative group">
              {/* Timeline Bullet Node */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border ring-4 ring-white ${
                  log.status === 'DELIVERED'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                {getStatusIcon(log.status)}
              </div>

              {/* Event Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 hover:border-slate-300 transition-colors shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusBadge(log.status)}`}>
                      {getStatusLabel(log.status)}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {log.changedByName}
                    </span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-medium rounded border ${roleBadges[log.changedByRole]}`}>
                      {roleTranslations[log.changedByRole]}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">{logDate}</span>
                </div>

                {log.notes && <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-200">{log.notes}</p>}

                {itemsSnapshotList.length > 0 && (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-medium">Барааны snapshot:</span>
                    {itemsSnapshotList.map((item, i) => {
                      const prod = products?.find(p => p.sku === item.sku);
                      return (
                        <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[10px] border border-slate-200" title={prod?.name || 'Тодорхойгүй бараа'}>
                          {prod ? prod.name : item.sku} (x{item.qty || item.quantity})
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

