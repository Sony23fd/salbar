import React, { useState, useMemo } from 'react';
import { Calculator, Save } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Product, Category } from '../types/wms';

interface PricingModelTabProps {
  products: Product[];
  categories: Category[];
  globalFixedCost: number;
  onRefresh: () => void;
}

export const PricingModelTab: React.FC<PricingModelTabProps> = ({
  products,
  categories,
  globalFixedCost: initialGlobalFixedCost,
  onRefresh,
}) => {
  const [globalFixedCost, setGlobalFixedCost] = useState<number>(initialGlobalFixedCost);
  const [saving, setSaving] = useState(false);

  const [localCategories, setLocalCategories] = useState<Record<string, number>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.fixedCostAllocPercent || 0 }), {})
  );

  const [localProducts, setLocalProducts] = useState<Record<string, {
    dailyProductionTarget: number;
    packagingCost: number;
    laborCost: number;
    profitPercent: number;
  }>>(
    products.reduce((acc, p) => ({
      ...acc,
      [p.id]: {
        dailyProductionTarget: p.dailyProductionTarget || 0,
        packagingCost: Number(p.packagingCost || 0),
        laborCost: Number(p.laborCost || 0),
        profitPercent: p.profitPercent || 0,
      }
    }), {})
  );

  const categoriesWithProducts = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      products: products.filter(p => p.categoryId === cat.id && p.materialType === 'FINISHED_GOOD')
    })).filter(cat => cat.products.length > 0);
  }, [categories, products]);

  const handleCategoryChange = (catId: string, value: number) => {
    setLocalCategories(prev => ({ ...prev, [catId]: value }));
  };

  const handleProductChange = (productId: string, field: string, value: number) => {
    setLocalProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await api.saveSetting('TOTAL_MONTHLY_FIXED_COST', globalFixedCost.toString());

      await Promise.all(
        Object.entries(localCategories).map(([id, percent]) => 
          api.put(`/categories/${id}`, { fixedCostAllocPercent: percent })
        )
      );

      await Promise.all(
        Object.entries(localProducts).map(([id, data]: [string, any]) =>
          api.updateProduct(id, {
            dailyProductionTarget: data.dailyProductionTarget,
            packagingCost: data.packagingCost,
            laborCost: data.laborCost,
            profitPercent: data.profitPercent
          })
        )
      );

      toast.success('Бүх өөрчлөлт хадгалагдлаа');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Сарын нийт тогтмол зардал (₮)</label>
          <input
            type="number"
            value={globalFixedCost}
            onChange={(e) => setGlobalFixedCost(parseFloat(e.target.value) || 0)}
            className="w-64 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Хадгалж байна...' : 'Бүх өөрчлөлтийг хадгалах'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                <th className="p-3 border-b border-slate-200 font-bold whitespace-nowrap">Бүтээгдэхүүн</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">Жин</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">Өдөрт (ш)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">Сард (ш)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right text-blue-700 whitespace-nowrap">ТЭМ (₮)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right text-amber-700 whitespace-nowrap">СББ (₮)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right text-emerald-700 whitespace-nowrap">Ажил (₮)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right text-purple-700 whitespace-nowrap">Тогтмол (₮)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right text-red-700 bg-red-50/50 whitespace-nowrap">ББӨ (₮)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">Ашиг %</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">Ашиг (₮)</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">Борлуулалт 8%</th>
                <th className="p-3 border-b border-slate-200 font-bold text-right whitespace-nowrap">НӨАТ 10%</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {categoriesWithProducts.map(category => {
                const catPercent = localCategories[category.id] || 0;
                const catFixedCost = globalFixedCost * (catPercent / 100);

                return (
                  <React.Fragment key={category.id}>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <td colSpan={13} className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-4">
                          <span>Ангилал: {category.name}</span>
                          <div className="flex items-center gap-2 text-xs font-normal">
                            <span className="text-slate-500">Сарын тогтмол зардал эзлэх хувь:</span>
                            <div className="relative">
                              <input
                                type="number"
                                value={catPercent}
                                onChange={(e) => handleCategoryChange(category.id, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right"
                              />
                              <span className="absolute right-2 top-1.5 text-slate-400">%</span>
                            </div>
                            <span className="ml-2 font-mono text-purple-700">({catFixedCost.toLocaleString()} ₮)</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {category.products.map(product => {
                      const lData = localProducts[product.id] || { dailyProductionTarget: 0, packagingCost: 0, laborCost: 0, profitPercent: 0 };
                      const monthlyTarget = lData.dailyProductionTarget * 22; // Hardcoded 22 days per month
                      const temCost = Number(product.costPrice || 0);
                      const sbbCost = lData.packagingCost;
                      const laborCost = lData.laborCost;
                      
                      const fixedCostPerUnit = monthlyTarget > 0 ? (catFixedCost / monthlyTarget) : 0;
                      const cogs = temCost + sbbCost + laborCost + fixedCostPerUnit;
                      const profitAmount = cogs * (lData.profitPercent / 100);
                      
                      const basePrice = (cogs + profitAmount) / (1 - 0.088);
                      const vatAmount = basePrice * 0.10;
                      const commissionAmount = basePrice * 1.1 * 0.08;

                      return (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">{product.name}</td>
                          <td className="p-3 text-right text-slate-500">{product.unit || 'ш'}</td>
                          
                          <td className="p-3">
                            <input
                              type="number"
                              value={lData.dailyProductionTarget || ''}
                              onChange={(e) => handleProductChange(product.id, 'dailyProductionTarget', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right ml-auto block"
                            />
                          </td>
                          
                          <td className="p-3 text-right font-mono text-slate-700 bg-slate-50">
                            {monthlyTarget.toLocaleString()}
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                            {temCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} ₮
                          </td>

                          <td className="p-3 text-right font-mono text-amber-700 bg-amber-50/30">
                            <input
                              type="number"
                              value={lData.packagingCost || ''}
                              onChange={(e) => handleProductChange(product.id, 'packagingCost', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 bg-white border border-amber-200 rounded font-mono text-right ml-auto block text-amber-700"
                            />
                          </td>

                          <td className="p-3 text-right font-mono text-emerald-700 bg-emerald-50/30">
                            <input
                              type="number"
                              value={lData.laborCost || ''}
                              onChange={(e) => handleProductChange(product.id, 'laborCost', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 bg-white border border-emerald-200 rounded font-mono text-right ml-auto block text-emerald-700"
                            />
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-purple-700 bg-purple-50/30">
                            {fixedCostPerUnit.toLocaleString(undefined, { maximumFractionDigits: 1 })} ₮
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-red-700 bg-red-50">
                            {cogs.toLocaleString(undefined, { maximumFractionDigits: 1 })} ₮
                          </td>

                          <td className="p-3">
                            <div className="relative w-20 ml-auto">
                              <input
                                type="number"
                                value={lData.profitPercent || ''}
                                onChange={(e) => handleProductChange(product.id, 'profitPercent', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right"
                              />
                              <span className="absolute right-2 top-1.5 text-slate-400 text-xs">%</span>
                            </div>
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-green-700">
                            {profitAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} ₮
                          </td>

                          <td className="p-3 text-right font-mono text-slate-600">
                            {commissionAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} ₮
                          </td>

                          <td className="p-3 text-right font-mono text-slate-600">
                            {vatAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} ₮
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {categoriesWithProducts.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500">
                    Үйлдвэрлэлийн бүтээгдэхүүн болон ангилал олдсонгүй.
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
