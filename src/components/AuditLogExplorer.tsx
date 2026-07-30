import React, { useState } from 'react';
import { Order, OrderHistory, Role, OrderStatus, Product } from '../types/wms';
import { History, Search, Filter, ShieldCheck, User, Clock, FileText, Code2, Eye, Package } from 'lucide-react';

interface AuditLogExplorerProps {
  orders: Order[];
  products: Product[];
}

export const AuditLogExplorer: React.FC<AuditLogExplorerProps> = ({ orders, products }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<{ title: string; json: string } | null>(null);

  // Flatten all history logs from all orders
  const allLogs: (OrderHistory & { orderNumber: string; branchName: string })[] = [];
  orders.forEach((ord) => {
    ord.history.forEach((hist) => {
      allLogs.push({
        ...hist,
        orderNumber: ord.orderNumber,
        branchName: ord.branchName,
      });
    });
  });

  // Sort logs descending (newest first)
  allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredLogs = allLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.orderNumber.toLowerCase().includes(q) ||
      log.branchName.toLowerCase().includes(q) ||
      log.changedByName.toLowerCase().includes(q) ||
      log.status.toLowerCase().includes(q) ||
      (log.notes && log.notes.toLowerCase().includes(q))
    );
  });

  const roleBadges: Record<Role, string> = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    WAREHOUSE_WORKER: 'bg-blue-50 text-blue-700 border-blue-200',
    DELIVERY_DRIVER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const roleTranslations: Record<Role, string> = {
    ADMIN: 'Админ',
    WAREHOUSE_WORKER: 'Агуулахын ажилтан',
    DELIVERY_DRIVER: 'Жолооч',
  };

  const statusColors: Record<OrderStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    PROCESSING: 'bg-blue-50 text-blue-800 border-blue-200',
    PACKED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    IN_TRANSIT: 'bg-purple-50 text-purple-800 border-purple-200',
    DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-800 border-red-200',
  };

  const statusTranslations: Record<OrderStatus, string> = {
    PENDING: 'Хүлээгдэж буй',
    PROCESSING: 'Боловсруулж буй',
    PACKED: 'Савлагдсан',
    IN_TRANSIT: 'Тээвэрлэлтэд',
    DELIVERED: 'Хүргэгдсэн',
    CANCELLED: 'Цуцлагдсан',
  };

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
            Нэвтрүүлсэн өөрчлөлтүүд, захиалгын төлөв шинэчлэлт ба агуулахын үлдэгдлийн өөрчлөлтийн бүртгэл
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          Нийт бүртгэл: {allLogs.length}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Захиалгын №, хэрэглэгч, төлөв эсвэл тэмдэглэлээр хайх..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Огноо, цаг</th>
                <th className="p-4">Захиалга & Салбар</th>
                <th className="p-4">Гүйцэтгэсэн хэрэглэгч</th>
                <th className="p-4">Төлөвийн өөрчлөлт</th>
                <th className="p-4">Тэмдэглэл & Аудит дэлгэрэнгүй</th>
                <th className="p-4 text-center">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    Хайлтад тохирох түүх олдсонгүй.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString('mn-MN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors font-sans">
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-blue-700 font-mono">{log.orderNumber}</div>
                        <div className="text-[11px] text-slate-500">{log.branchName}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.changedByName}
                        </div>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${roleBadges[log.changedByRole]}`}>
                          {roleTranslations[log.changedByRole]}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${statusColors[log.status]}`}>
                          {statusTranslations[log.status]}
                        </span>
                      </td>

                      <td className="p-4 text-slate-700 max-w-xs">
                        <div className="truncate text-xs">{log.notes || 'Нэмэлт тэмдэглэл байхгүй.'}</div>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() =>
                            setSelectedSnapshot({
                              title: `Захиалга ${log.orderNumber} Snapshot (${statusTranslations[log.status]})`,
                              json: log.itemsSnapshot,
                            })
                          }
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="JSON Snapshot харах"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" /> {selectedSnapshot.title}
              </h3>
              <button onClick={() => setSelectedSnapshot(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-0">
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {(() => {
                  try {
                    const items = JSON.parse(selectedSnapshot.json || '[]');
                    if (!items || items.length === 0) {
                      return <div className="p-4 text-center text-slate-500 text-xs">Барааны мэдээлэл байхгүй байна.</div>;
                    }
                    return (
                      <div className="space-y-2">
                        {items.map((item: any, idx: number) => {
                          const prod = products.find(p => p.sku === item.sku);
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 text-sm truncate">
                                  {prod ? prod.name : 'Тодорхойгүй бараа'}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                  {item.sku}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  x{item.qty || item.quantity}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } catch (e) {
                    return (
                      <div className="p-6">
                        <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                          {selectedSnapshot.json}
                        </pre>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

