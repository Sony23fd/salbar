const fs = require('fs');
let content = fs.readFileSync('src/components/BranchManager.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { Branch, InactiveBranchAlert, User, BranchType } from '../types/wms';",
  "import { Branch, InactiveBranchAlert, User, BranchType, Order, OrderStatus } from '../types/wms';"
);

content = content.replace(
  "Users, ClipboardList } from 'lucide-react';",
  "Users, ClipboardList, History, Package } from 'lucide-react';"
);

// 2. Props
content = content.replace(
  "  branches: Branch[];\n  inactiveAlerts",
  "  branches: Branch[];\n  orders: Order[];\n  inactiveAlerts"
);

content = content.replace(
  "  branches,\n  inactiveAlerts",
  "  branches,\n  orders,\n  inactiveAlerts"
);

// 3. State
content = content.replace(
  "  const [showModal, setShowModal] = useState(false);",
  "  const [showModal, setShowModal] = useState(false);\n  const [historyBranchId, setHistoryBranchId] = useState<string | null>(null);\n  const [expandedOrderHistoryId, setExpandedOrderHistoryId] = useState<string | null>(null);"
);

// 4. Buttons
content = content.replace(
  /(\s*<button\s*onClick=\{\(\) => onQuickOrder\(b\.id\)\}[\s\S]*?<\/button>)/,
  `
                <button
                  onClick={() => setHistoryBranchId(b.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  ????
                </button>$1`
);

// 5. Modal
const modalCode = `

      {/* History Modal */}
      {historyBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-2xl">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                {branches.find((b) => b.id === historyBranchId)?.name} - ????????? ????
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
                      <h4 className="text-sm font-bold text-slate-700 mb-1">???????? ???? ?????</h4>
                      <p className="text-xs text-slate-500">??? ?????? ???? ???????? ???????? ????????????? ?????.</p>
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
                                <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full border \${statusColors[order.status]}\`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(order.createdAt).toLocaleString('mn-MN')}
                                </span>
                                <span>•</span>
                                <span>????????: {order.createdByName}</span>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                              <div>
                                <div className="text-[10px] uppercase font-bold text-slate-400">???? ???</div>
                                <div className="text-sm font-bold text-slate-800">?{order.totalAmount.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50 p-4">
                              <h5 className="text-[11px] uppercase font-bold text-slate-500 mb-3">????????? ????????? ({order.items.length})</h5>
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg">
                                    <div>
                                      <div className="text-xs font-semibold text-slate-800">{item.productName}</div>
                                      <div className="text-[10px] text-slate-500">{item.sku} | ?{item.unitPrice.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-bold text-blue-600">{item.quantity} ?</div>
                                      <div className="text-[11px] font-bold text-slate-700">?{item.totalPrice.toLocaleString()}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {order.deliveredAt && (
                                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  ??????????: {new Date(order.deliveredAt).toLocaleString('mn-MN')} (??????: {order.deliveredByName})
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
                ????
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace("      {/* Form Modal */}", modalCode + "\n      {/* Form Modal */}");

fs.writeFileSync('src/components/BranchManager.tsx', content);
console.log("Updated BranchManager.tsx");
