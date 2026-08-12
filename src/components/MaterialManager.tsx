import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Product, User, MaterialType } from '../types/wms';
import { api } from '../lib/api';
import {
  Boxes,
  Search,
  Plus,
  RefreshCw,
  X,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Truck,
  DollarSign,
  Pencil,
  Trash2,
  RefreshCcw
} from 'lucide-react';
import { MaterialIssueModal } from './MaterialIssueModal';

interface MaterialManagerProps {
  products: Product[];
  currentUser: User;
  onRefresh: () => void;
}

export const MaterialManager: React.FC<MaterialManagerProps> = ({
  products,
  currentUser,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [replenishTarget, setReplenishTarget] = useState<Product | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Product | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form states for New Material
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('RAW_MATERIAL');
  const [unit, setUnit] = useState('кг');
  const [unitPrice, setUnitPrice] = useState<number | ''>(0);
  const [stockQuantity, setStockQuantity] = useState<number | ''>(0);
  const [minStockLevel, setMinStockLevel] = useState<number | ''>(10);
  const [description, setDescription] = useState('');

  // Form state for Replenish/Stock Increase
  const [replenishQty, setReplenishQty] = useState<number | ''>(50);
  const [replenishCostPrice, setReplenishCostPrice] = useState<number | ''>('');

      const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'WAREHOUSE_WORKER' || currentUser.role === 'FINANCE';

  // Material Types Mongolian Names
  const materialTypeNames: Record<MaterialType, string> = {
    RAW_MATERIAL: 'Түүхий эд материал',
    PACKAGING: 'Сав баглаа боодол',
    AUXILIARY: 'Туслах материал',
    SUPPLY: 'Хангамжийн материал',
    FINISHED_GOOD: 'Бэлэн бүтээгдэхүүн'
  };

  const materialTypeBadges: Record<MaterialType, string> = {
    RAW_MATERIAL: 'bg-amber-100 text-amber-800 border-amber-200',
    PACKAGING: 'bg-purple-100 text-purple-800 border-purple-200',
    AUXILIARY: 'bg-blue-100 text-blue-800 border-blue-200',
    SUPPLY: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    FINISHED_GOOD: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };

  // Filter materials (exclude finished goods)
  const materialsList = useMemo(() => {
    return products.filter((p) => {
      const isMaterial = p.materialType && p.materialType !== 'FINISHED_GOOD';
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'ALL' || p.materialType === typeFilter;
      const matchesActive = showInactive ? !p.isActive : p.isActive;
      return isMaterial && matchesSearch && matchesType && matchesActive;
    });
  }, [products, searchQuery, typeFilter, showInactive]);

  // Handle Create Material
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    ;
    ;
    setIsSubmitting(true);

    try {
      const generatedSku = sku || `MAT-${Date.now().toString().slice(-6)}`;
      await api.addProduct({
        sku: generatedSku.toUpperCase(),
        name,
        description,
        materialType,
        unit: unit || 'кг',
        unitPrice: Number(unitPrice) || 0,
        costPrice: Number(unitPrice) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        minStockLevel: Number(minStockLevel) || 5,
        isActive: true
      });

      toast.success('Шинэ ТЭМ / Сав баглаа материал амжилттай бүртгэгдлээ!');
      setTimeout(() => {
        setShowAddModal(false);
        setName('');
        setSku('');
        setDescription('');
        setUnitPrice(0);
        setStockQuantity(0);
        setMinStockLevel(10);
        ;
        onRefresh();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Материал бүртгэхэд алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (mat: Product) => {
    setEditingMaterial(mat);
    setName(mat.name);
    setSku(mat.sku);
    setDescription(mat.description || '');
    setMaterialType(mat.materialType as MaterialType);
    setUnit(mat.unit || 'кг');
    setUnitPrice(mat.unitPrice || 0);
    setStockQuantity(mat.stockQuantity || 0);
    setMinStockLevel(mat.minStockLevel || 10);
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    setIsSubmitting(true);
    try {
      await api.updateProduct(editingMaterial.id, {
        name,
        description,
        materialType,
        unit,
        unitPrice: Number(unitPrice),
        costPrice: Number(unitPrice),
        minStockLevel: Number(minStockLevel)
      });
      toast.success('Материалын мэдээлэл шинэчлэгдлээ!');
      setEditingMaterial(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Энэ материалыг устгах уу? (Идэвхгүй болгох)')) return;
    try {
      await api.deactivateProduct(id);
      toast.success('Материал устгагдлаа');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.reactivateProduct(id);
      toast.success('Материал сэргээгдлээ');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  // Handle Replenish Material Stock
  const handleReplenishMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishTarget) return;

    setIsSubmitting(true);

    try {
      const addQty = Number(replenishQty || 0);
      const newPrice = Number(replenishCostPrice || replenishTarget.unitPrice || 0);

      // 1. Үнэ өөрчлөгдсөн бол шинэчлэх
      await api.updateProduct(replenishTarget.id, {
        costPrice: newPrice,
        unitPrice: newPrice
      });

      // 2. Агуулахын нөөц нэмэх (Transaction үүсгэх)
      if (addQty > 0) {
        await api.replenishProduct(
          replenishTarget.id,
          addQty,
          currentUser.id,
          `ТЭМ татан авалт. Өртөг: ${newPrice}₮`
        );
      }

      toast.success('Материалын агуулахын нөөц амжилттай нэмэгдлээ!');
      
      // 3. UI-г шууд шинэчлэх
      setReplenishTarget(null);
      setReplenishQty(50);
      setReplenishCostPrice('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-purple-600" />
            ТЭМ & Сав Баглаа Материалын Агуулах
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Үйлдвэрлэлд хэрэглэгдэх Түүхий эд, Сав баглаа боодол, Туслах ба Хангамжийн материалын нөөц, худалдан авах өртгийн нэгдсэн удирдлага
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowIssueModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors shadow-xs border border-amber-200"
            >
              <Minus className="w-4 h-4" /> Зарлагадах / Олгох
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Шинэ ТЭМ / Сав баглаа бүртгэх
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Түүхий эдийн төрөл</div>
            <div className="text-xl font-black text-slate-900">
              {products.filter(p => p.materialType === 'RAW_MATERIAL').length} төрөл
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Сав баглаа боодол</div>
            <div className="text-xl font-black text-slate-900">
              {products.filter(p => p.materialType === 'PACKAGING').length} төрөл
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Туслах & Хангамж</div>
            <div className="text-xl font-black text-slate-900">
              {products.filter(p => p.materialType === 'AUXILIARY' || p.materialType === 'SUPPLY').length} төрөл
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Нийт Материалын Өртөг</div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              ₮{materialsList.reduce((sum, p) => sum + (p.stockQuantity * (Number(p.costPrice) || Number(p.unitPrice))), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Бүх материал ({products.filter(p => p.materialType && p.materialType !== 'FINISHED_GOOD').length})
          </button>
          <button
            onClick={() => setTypeFilter('RAW_MATERIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'RAW_MATERIAL' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🥛 Түүхий эд
          </button>
          <button
            onClick={() => setTypeFilter('PACKAGING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'PACKAGING' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 Сав баглаа
          </button>
          <button
            onClick={() => setTypeFilter('AUXILIARY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'AUXILIARY' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🛠 Туслах & Хангамж
          </button>
        </div>

        {/* Inactive Filter Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
            Устгасан харуулах
          </label>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Материал хайх..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold text-[11px] uppercase">Материалын нэр / SKU</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase">Төрөл</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Үлдэгдэл нөөц</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Эхний үлдэгдэл</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нэгж худалдан авах өртөг</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нийт нөөцийн өртөг</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase text-center">Төлөв</th>
                {canEdit && <th className="px-4 py-3 font-bold text-[11px] uppercase text-center">Үйлдэл</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materialsList.map((m) => {
                const mType = (m.materialType || 'RAW_MATERIAL') as MaterialType;
                const cost = Number(m.costPrice) > 0 ? Number(m.costPrice) : Number(m.unitPrice);
                const totalVal = m.stockQuantity * cost;
                const isLow = m.stockQuantity <= m.minStockLevel;

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{m.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${materialTypeBadges[mType]}`}>
                        {materialTypeNames[mType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      <span className={isLow ? 'text-amber-700' : 'text-slate-900'}>
                        {m.stockQuantity} {m.unit || 'ш'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">
                      {m.initialStock || 0} {m.unit || 'ш'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      ₮{cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">
                      ₮{totalVal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!m.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Идэвхгүй
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Нөөц бага
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Хангалттай
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {m.isActive ? (
                            <>
                              <button
                                onClick={() => setReplenishTarget(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                                title="Татан авах"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditClick(m)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Засах"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeactivate(m.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Устгах"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleReactivate(m.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" /> Сэргээх
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {materialsList.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Түүхий эд эсвэл сав баглаа материал олдсонгүй. "Шинэ ТЭМ бүртгэх" товчоор нэмнэ үү.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTER NEW MATERIAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" /> Шинэ ТЭМ / Сав баглаа материал бүртгэх
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              
              

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Материалын Төрөл *</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                >
                  <option value="RAW_MATERIAL">🥛 Түүхий эд материал (Сүү, алим, гурил г.м)</option>
                  <option value="PACKAGING">📦 Сав баглаа боодол (Уут, хайрцаг, шил г.м)</option>
                  <option value="AUXILIARY">🛠 Туслах материал (Тос, амтлагч г.м)</option>
                  <option value="SUPPLY">⚙ Хангамжийн материал</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Материалын Нэр *</label>
                <input
                  type="text"
                  placeholder="д.г: Сүү (Литрийн), Гофро хайрцаг"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хэмжих нэгж (кг, л, ш г.м) *</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="кг, л, ш..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Худалдан авах нэгж өртөг (₮) *</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1500"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Анхны нөөцийн тоо</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Доод нөөц (Анхааруулга)</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  Материал Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPLENISH MATERIAL STOCK */}
      {replenishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">ТЭМ / Материал Орлогодох</h3>
                <p className="text-xs text-slate-500">{replenishTarget.name} ({replenishTarget.sku})</p>
              </div>
              <button onClick={() => setReplenishTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReplenishMaterial} className="space-y-4">
              

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Нэмж авсан тоо хэмжээ ({replenishTarget.unit || 'ш'}) *</label>
                <input
                  type="number"
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Шинэ нэгж худалдан авах үнэ (₮)</label>
                <input
                  type="number"
                  placeholder={`Одоогийн үнэ: ₮${replenishTarget.costPrice || replenishTarget.unitPrice}`}
                  value={replenishCostPrice}
                  onChange={(e) => setReplenishCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplenishTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  Орлогодон Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: EDIT MATERIAL */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" /> ТЭМ / Сав баглаа засах
              </h3>
              <button onClick={() => setEditingMaterial(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Материалын нэр *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Төрөл *</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="RAW_MATERIAL">Түүхий эд</option>
                    <option value="PACKAGING">Сав баглаа</option>
                    <option value="AUXILIARY">Туслах материал</option>
                    <option value="SUPPLY">Хангамж</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хэмжих нэгж *</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Нэгж өртөг (₮) *</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Доод нөөц</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  Шинэчлэх
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showIssueModal && (
        <MaterialIssueModal
          materials={materialsList}
          onClose={() => setShowIssueModal(false)}
          onSuccess={() => {
            setShowIssueModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
