import React, { useState, useEffect, useMemo } from 'react';
import { InventoryTransaction, User } from '../types/wms';
import { db } from '../lib/db';
import { api } from '../lib/api';
import { FileText, Search, ArrowUpRight, ArrowDownRight, Settings2, Download, TrendingUp, AlertTriangle, PieChart, Boxes } from 'lucide-react';

interface ReportsManagerProps {
  currentUser: User;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({ currentUser }) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;
  
  // Financial Summary State
  const [financialData, setFinancialData] = useState<any>(null);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { startDate, endDate } = useMemo(() => {
    if (dateRange === 'all') return { startDate: undefined, endDate: undefined };
    if (dateRange === 'custom') {
      if (!customStart || !customEnd) return { startDate: undefined, endDate: undefined };
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();
    
    if (dateRange === 'today') {
      // start is already today
    } else if (dateRange === '7days') {
      start.setDate(start.getDate() - 7);
    } else if (dateRange === '30days') {
      start.setDate(start.getDate() - 30);
    } else if (dateRange === 'thisMonth') {
      start.setDate(1);
    } else if (dateRange === 'lastMonth') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
    } else if (dateRange === 'thisYear') {
      start.setMonth(0, 1);
    }
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    // Debounce loadData when search query changes
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [startDate, endDate, page, typeFilter, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const txRes = await api.getPaginatedTransactions(page, limit, searchQuery, typeFilter, startDate, endDate);
      setTransactions(txRes.data);
      setTotalPages(txRes.totalPages || 1);
      
      try {
        const finData = await api.getFinancialSummary(startDate, endDate);
        setFinancialData(finData);
      } catch (err: any) {
        // Finance summary might be restricted by role (e.g., WAREHOUSE_WORKER)
        setFinancialData(null);
      }
    } catch (err) {
      console.error('Failed to load transactions data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // filteredTransactions logic removed since it's now handled by backend

  const getTransactionIcon = (type: string) => {
    if (type === 'INBOUND') return <ArrowDownRight className="w-4 h-4 text-emerald-600" />;
    if (type === 'OUTBOUND') return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
    return <Settings2 className="w-4 h-4 text-amber-600" />;
  };

  const getTransactionLabel = (type: string) => {
    if (type === 'INBOUND') return 'Орлого (Татан авалт)';
    if (type === 'OUTBOUND') return 'Зарлага (Хүргэлт)';
    return 'Тохируулга';
  };

  const summary = financialData?.summary;

  const downloadExcel = () => {
    if (!summary) return;
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + "Үзүүлэлт,Дүн\n"
      + `Нийт татан авалт,${summary.totalProcurementAmount}\n`
      + `Үйлдвэрт (Орцоор) олгосон ТЭМ,${summary.totalMaterialsIssuedCost}\n`
      + `Гараар (Дотоод) зарлагадсан ТЭМ,${summary.totalManualOutboundCost}\n`
      + `Үйлдвэрлэлийн тогтмол зардал,${summary.totalFixedOverheadCost}\n`
      + `Нийт хорогдол,${summary.totalScrapLoss}\n`
      + `Агуулахын тохируулга (Устгал/Илүүдэл),${summary.totalAdjustmentImpact}\n`
      + `Нийт үйлдвэрлэлийн өртөг,${summary.totalProductionCost}\n`
      + `Нийт борлуулалтын орлого,${summary.totalDeliveredRevenue}\n`
      + `Цэвэр ашиг,${summary.totalDeliveredNetProfit}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Санхүүгийн нэгдсэн тайлан & Хөдөлгөөн
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Байгууллагын нийт орлого, зардал, хорогдол болон агуулахын гүйлгээний түүх.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Өнөөдөр</option>
            <option value="7days">Сүүлийн 7 хоног</option>
            <option value="thisMonth">Энэ сар</option>
            <option value="lastMonth">Өмнөх сар</option>
            <option value="30days">Сүүлийн 30 хоног</option>
            <option value="thisYear">Энэ жил</option>
            <option value="all">Бүх хугацаа</option>
            <option value="custom">Сонгох...</option>
          </select>
          
          <button
            onClick={downloadExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all shadow-sm border border-blue-200"
          >
            <Download className="w-4 h-4" />
            Excel татах
          </button>
        </div>
      </div>

      {/* COMPREHENSIVE FINANCIAL DASHBOARD */}
      {summary && currentUser.role !== 'WAREHOUSE_WORKER' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <ArrowDownRight className="w-4 h-4 text-blue-500" /> Татан авалт (Зардал)
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₮{(summary.totalProcurementAmount || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <Boxes className="w-4 h-4 text-amber-500" /> Үйлдвэрлэл & Дотоод Зарлага
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-2">
              ₮{((summary.totalMaterialsIssuedCost || 0) + (summary.totalManualOutboundCost || 0)).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Автоматаар (Орц): ₮{(summary.totalMaterialsIssuedCost || 0).toLocaleString()} <span className="mx-1 opacity-50">|</span> Гараар (Дотоод): ₮{(summary.totalManualOutboundCost || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Нийт Хорогдол & Тохируулга
            </div>
            <div className="text-2xl font-black text-red-600 font-mono">
              ₮{((summary.totalScrapLoss || 0) - (summary.totalAdjustmentImpact || 0)).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500">Үйлдвэрийн хорогдол болон устгал/дутагдал</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl shadow-sm space-y-3 text-white">
            <div className="flex items-center gap-2 text-emerald-100 font-bold text-[10px] uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-100" /> Борлуулалт & Цэвэр Ашиг
            </div>
            <div className="text-2xl font-black font-mono">
              ₮{(summary.totalDeliveredNetProfit || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-emerald-100">Орлого: ₮{(summary.totalDeliveredRevenue || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* INVENTORY TRANSACTIONS TABLE */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 px-1">
          <FileText className="w-4 h-4 text-slate-500" /> Агуулахын дэлгэрэнгүй гүйлгээ
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Барааны нэр, SKU эсвэл тайлбараар хайх..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs font-medium"
            >
              <option value="ALL">Бүх гүйлгээ</option>
              <option value="INBOUND">Орлого (Татан авалт)</option>
              <option value="OUTBOUND">Зарлага (Хүргэлт)</option>
              <option value="ADJUSTMENT">Тохируулга</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Огноо</th>
                  <th className="p-4">Гүйлгээний төрөл</th>
                  <th className="p-4">Бараа</th>
                  <th className="p-4 text-right">Орлого (+)</th>
                  <th className="p-4 text-right">Зарлага (-)</th>
                  <th className="p-4 text-right">Үлдэгдэл</th>
                  <th className="p-4 text-right">Нэгж үнэ</th>
                  <th className="p-4 text-right">Нийт дүн</th>
                  <th className="p-4">Хариуцсан хэрэглэгч</th>
                  <th className="p-4">Тайлбар</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">Уншиж байна...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">Гүйлгээ олдсонгүй. (Шүүлтүүрээ шалгана уу)</td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-500">
                        {new Date(t.createdAt).toLocaleString('mn-MN')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          {getTransactionIcon(t.type)}
                          <span className={t.type === 'INBOUND' ? 'text-emerald-700' : t.type === 'OUTBOUND' ? 'text-blue-700' : 'text-amber-700'}>
                            {getTransactionLabel(t.type)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{t.product?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.product?.sku}</div>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-600">
                        {t.quantity > 0 ? `+${t.quantity}` : '-'}
                        {t.quantity > 0 && t.secondaryQuantity !== undefined && t.secondaryQuantity !== null && (
                          <div className="text-[10px] text-emerald-500 font-medium">+{t.secondaryQuantity} ш</div>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-red-600">
                        {t.quantity < 0 ? `${t.quantity}` : '-'}
                        {t.quantity < 0 && t.secondaryQuantity !== undefined && t.secondaryQuantity !== null && (
                          <div className="text-[10px] text-red-500 font-medium">{t.secondaryQuantity} ш</div>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-900 font-mono font-bold">
                        {t.newStock}
                        {t.newSecondaryStock !== undefined && t.newSecondaryStock !== null && (
                          <div className="text-[10px] text-slate-500 font-medium">{t.newSecondaryStock} ш</div>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-500 font-mono font-medium">
                        {t.product ? ((t.product.costPrice && t.product.costPrice > 0) ? t.product.costPrice : (t.product.unitPrice || 0)).toLocaleString() + '₮' : '-'}
                      </td>
                      <td className="p-4 text-right text-slate-900 font-mono font-bold">
                        {t.product ? (Math.abs(t.quantity) * ((t.product.costPrice && t.product.costPrice > 0) ? t.product.costPrice : (t.product.unitPrice || 0))).toLocaleString() + '₮' : '-'}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{t.user?.name}</div>
                        <div className="text-[10px] text-slate-500">{t.user?.role}</div>
                      </td>
                      <td className="p-4 text-slate-600 italic max-w-[200px] truncate" title={t.notes || ''}>
                        {t.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Хуудас {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Өмнөх
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Дараах
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
