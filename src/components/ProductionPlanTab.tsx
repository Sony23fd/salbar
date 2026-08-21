import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Product, ProductionBatch } from '../types/wms';

interface ProductionPlanTabProps {
  products: Product[];
  productionBatches: ProductionBatch[];
}

export const ProductionPlanTab: React.FC<ProductionPlanTabProps> = ({
  products,
  productionBatches,
}) => {
  const [workingDays, setWorkingDays] = useState<number>(22); // Manual entry for working days

  const planData = useMemo(() => {
    const finishedGoods = products.filter(p => p.materialType === 'FINISHED_GOOD' || !p.materialType);
    
    return finishedGoods.map(product => {
      const dailyTarget = product.dailyProductionTarget || 0;
      const plannedQuantity = dailyTarget * workingDays;
      
      const actualBatches = productionBatches.filter(b => b.finishedProductId === product.id);
      const actualQuantity = actualBatches.reduce((sum, batch) => sum + batch.quantityProduced, 0);
      
      const difference = actualQuantity - plannedQuantity;
      const fulfillmentPercent = plannedQuantity > 0 ? (actualQuantity / plannedQuantity) * 100 : (actualQuantity > 0 ? 100 : 0);

      // Value metrics (using costPrice as a proxy for value, or we could just use simple cost)
      const unitValue = Number(product.costPrice || 0);
      const plannedValue = plannedQuantity * unitValue;
      const actualValue = actualQuantity * unitValue;

      return {
        ...product,
        plannedQuantity,
        actualQuantity,
        difference,
        fulfillmentPercent,
        plannedValue,
        actualValue
      };
    }).sort((a, b) => b.plannedQuantity - a.plannedQuantity); // Sort by highest planned volume
  }, [products, productionBatches, workingDays]);

  // Overall metrics
  const totalPlannedUnits = planData.reduce((sum, item) => sum + item.plannedQuantity, 0);
  const totalActualUnits = planData.reduce((sum, item) => sum + item.actualQuantity, 0);
  const overallFulfillment = totalPlannedUnits > 0 ? (totalActualUnits / totalPlannedUnits) * 100 : 0;
  const totalPlannedValue = planData.reduce((sum, item) => sum + item.plannedValue, 0);
  const totalActualValue = planData.reduce((sum, item) => sum + item.actualValue, 0);

  const getFulfillmentColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-600 bg-emerald-50';
    if (percent >= 80) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getBarColor = (percent: number) => {
    if (percent >= 100) return '#10b981'; // emerald-500
    if (percent >= 80) return '#f59e0b';  // amber-500
    return '#ef4444'; // red-500
  };

  // Prepare chart data (top 15 products by volume to not overcrowd the chart)
  const chartData = planData.filter(p => p.plannedQuantity > 0 || p.actualQuantity > 0).slice(0, 15).map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    'Төлөвлөгөө': item.plannedQuantity,
    'Гүйцэтгэл': item.actualQuantity,
    fulfillmentPercent: item.fulfillmentPercent
  }));

  return (
    <div className="space-y-6">
      {/* Settings & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <label className="block text-sm font-bold text-slate-700 mb-2">Тухайн хугацааны ажлын өдөр</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={workingDays}
              onChange={(e) => setWorkingDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              min="1"
            />
            <span className="text-slate-500 font-medium">өдөр</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Энэ тоонд үндэслэн төлөвлөгөөг бодно.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <h4 className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2">
            <Target className="w-4 h-4" /> Нийт Төлөвлөсөн
          </h4>
          <div className="text-2xl font-black text-slate-800">{totalPlannedUnits.toLocaleString()} <span className="text-sm font-medium text-slate-500">ш</span></div>
          <div className="text-sm text-slate-400 mt-1">{totalPlannedValue.toLocaleString()} ₮ (Өртгөөр)</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <h4 className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" /> Нийт Бодит гүйцэтгэл
          </h4>
          <div className="text-2xl font-black text-blue-600">{totalActualUnits.toLocaleString()} <span className="text-sm font-medium text-slate-500">ш</span></div>
          <div className="text-sm text-slate-400 mt-1">{totalActualValue.toLocaleString()} ₮ (Өртгөөр)</div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-center transition-colors ${
          overallFulfillment >= 100 ? 'bg-emerald-50 border-emerald-200' : 
          overallFulfillment >= 80 ? 'bg-amber-50 border-amber-200' : 
          'bg-red-50 border-red-200'
        }`}>
          <h4 className="text-sm font-bold mb-1 flex items-center gap-2 text-slate-700">
            <TrendingUp className="w-4 h-4" /> Ерөнхий Биелэлт
          </h4>
          <div className={`text-3xl font-black ${
            overallFulfillment >= 100 ? 'text-emerald-700' : 
            overallFulfillment >= 80 ? 'text-amber-700' : 
            'text-red-700'
          }`}>
            {overallFulfillment.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
          📊 Төлөвлөгөө ба Гүйцэтгэлийн Харьцуулалт (Топ 15)
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                tick={{ fontSize: 11, fill: '#64748b' }} 
              />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Төлөвлөгөө" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Гүйцэтгэл" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.fulfillmentPercent)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Бүтээгдэхүүн тус бүрийн биелэлт</h3>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> 100%+ (Давсан)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> 80-99% (Хэвийн)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> &lt;80% (Тасарсан)</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider">
                <th className="p-3 border-b border-slate-200 font-bold">Бүтээгдэхүүн</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right">Өдрийн норм</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right bg-blue-50/50">Нийт Төлөвлөгөө</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right">Бодит Гүйцэтгэл</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right">Зөрүү</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right">Биелэлт %</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {planData.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-800">{item.name} <span className="text-xs text-slate-400 font-normal ml-2">{item.sku}</span></td>
                  <td className="p-3 text-right font-mono text-slate-500">{(item.dailyProductionTarget || 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                    {item.plannedQuantity.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-700">
                    {item.actualQuantity.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${item.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.difference > 0 ? '+' : ''}{item.difference.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`px-3 py-1 rounded-full font-bold text-xs ${getFulfillmentColor(item.fulfillmentPercent)}`}>
                      {item.fulfillmentPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {planData.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Бэлэн бүтээгдэхүүн олдсонгүй.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
