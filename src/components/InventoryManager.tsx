import React, { useState } from 'react';
import { Product, User, MaterialType } from '../types/wms';
import { registerProduct, replenishStock } from '../actions/inventory';
import { db } from '../lib/db';
import { api } from '../lib/api';
import { Package, Search, Plus, RefreshCw, X, ShieldAlert, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Hash, Tag, FileText, Banknote, History, ExternalLink, Pencil, AlertCircle, ClipboardList, Layers } from 'lucide-react';

interface InventoryManagerProps {
  products: Product[];
  currentUser: User;
  onRefresh: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  currentUser,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [replenishTarget, setReplenishTarget] = useState<Product | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editWarning, setEditWarning] = useState<string | null>(null);

  // Form states for New Product / Material
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [minStockLevel, setMinStockLevel] = useState<number | ''>(5);
  const [categoryId, setCategoryId] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('FINISHED_GOOD');
  const [unit, setUnit] = useState<string>('ш');
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);

  React.useEffect(() => {
    db.getCategories().then(cats => setCategories(cats)).catch(console.error);
  }, []);

  // Form state for Replenish
  const [replenishQty, setReplenishQty] = useState<number | ''>(10);
  const [replenishNotes, setReplenishNotes] = useState('');
  const [isAdjustment, setIsAdjustment] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products
  const categoryOptions = Array.from(new Set(products.map((p) => p.category?.name || 'Бусад')));

  const filteredProducts = products.filter((p) => {
    const isFinishedGood = !p.materialType || p.materialType === 'FINISHED_GOOD';
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || (p.category?.name || 'Бусад') === categoryFilter;
    return isFinishedGood && matchesSearch && matchesCat;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      await api.addProduct({
        sku,
        name,
        description,
        unitPrice: Number(unitPrice),
        stockQuantity: Number(stockQuantity),
        minStockLevel: Number(minStockLevel),
        categoryId: categoryId || undefined,
        materialType: materialType,
        unit: unit || 'ш',
        isActive: true
      });

      setFormSuccess('Шинэ бараа / материал амжилттай бүртгэгдлээ!');
      setTimeout(() => {
        setShowAddModal(false);
        setSku('');
        setName('');
        setDescription('');
        setUnitPrice('');
        setStockQuantity('');
        setMinStockLevel(5);
        setCategoryId('');
        setMaterialType('FINISHED_GOOD');
        setUnit('ш');
        setFormSuccess(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setDescription(prod.description || '');
    setUnitPrice(prod.unitPrice);
    setMinStockLevel(prod.minStockLevel);
    setCategoryId(prod.categoryId || '');
    setMaterialType((prod.materialType as MaterialType) || 'FINISHED_GOOD');
    setUnit(prod.unit || 'ш');
    setEditWarning(null);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    // Check for 50% price change warning
    if (!editWarning) {
      const oldPrice = editingProduct.unitPrice;
      const newPrice = Number(unitPrice);
      if (oldPrice > 0) {
        const diffRatio = Math.abs(newPrice - oldPrice) / oldPrice;
        if (diffRatio > 0.5) {
          setEditWarning(`Үнэ ${oldPrice.toLocaleString()}₮ байснаас ${newPrice.toLocaleString()}₮ болж маш ихээр өөрчлөгдөх гэж байна. Үргэлжлүүлэхдээ итгэлтэй байна уу? Дахин хадгалах дарвал баталгаажна.`);
          return;
        }
      }
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await api.updateProduct(editingProduct.id, {
        name,
        description,
        unitPrice: Number(unitPrice),
        minStockLevel: Number(minStockLevel),
        categoryId: categoryId || undefined,
        materialType: materialType,
        unit: unit || 'ш'
      });
      setFormSuccess('Бараа / материалын мэдээлэл шинэчлэгдлээ!');
      setTimeout(() => {
        setEditingProduct(null);
        setFormSuccess(null);
        setEditWarning(null);
        onRefresh();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplenishStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishTarget) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await replenishStock(
        {
          productId: replenishTarget.id,
          quantityToAdd: Number(replenishQty),
          userId: currentUser.id,
          notes: replenishNotes,
          isAdjustment,
        },
        currentUser.role
      );

      if (!response.success) {
        setFormError(response.message);
      } else {
        setFormSuccess(`Барааны нөөц +${replenishQty} ширхэгээр нэмэгдлээ!`);
        setTimeout(() => {
          setReplenishTarget(null);
          setReplenishQty(10);
          setReplenishNotes('');
          setIsAdjustment(false);
          setFormSuccess(null);
          onRefresh();
        }, 1200);
      }
    } catch (err: any) {
      setFormError(err.message || 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRestockTask = async (product: Product) => {
    try {
      setIsSubmitting(true);
      await api.createTask({
        title: `Татан авалт хийх: ${product.name} (${product.sku})`,
        description: `Үлдэгдэл багассан тул яаралтай татан авалт хийх шаардлагатай байна.\nОдоогийн үлдэгдэл: ${product.stockQuantity}\nДоод хязгаар: ${product.minStockLevel}`,
        priority: 'HIGH',
        productId: product.id,
      });
      setFormSuccess(`${product.sku} бараанд татан авалтын даалгавар үүсгэлээ.`);
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Даалгавар үүсгэхэд алдаа гарлаа.');
      setTimeout(() => setFormError(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'WAREHOUSE_WORKER';

  const totalInventoryValue = products.reduce((sum, p) => sum + (Number(p.unitPrice) * p.stockQuantity), 0);
  const filteredInventoryValue = filteredProducts.reduce((sum, p) => sum + (Number(p.unitPrice) * p.stockQuantity), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Агуулахын бараа материалын бүртгэл
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Барааны код (SKU), үнэ, агуулахын үлдэгдлийн хяналт ба нөхөн татан авалт.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-sm font-semibold">
              <span>Нийт агуулахын дүн:</span>
              <span>₮{totalInventoryValue.toLocaleString()}</span>
            </div>
            {filteredProducts.length !== products.length && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-sm font-semibold animate-in fade-in zoom-in-95 duration-200">
                <span>Шүүгдсэн дүн:</span>
                <span>₮{filteredInventoryValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Шинэ бараа бүртгэх
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Барааны нэр эсвэл SKU-аар хайх..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs font-medium"
          >
            <option value="ALL">Бүх ангилал ({products.length})</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">SKU / Барааны мэдээлэл</th>
                <th className="p-4">Ангилал</th>
                <th className="p-4 text-right">Нэгж үнэ</th>
                <th className="p-4 text-right">Агуулахын үлдэгдэл</th>
                <th className="p-4 text-right">Нийт дүн</th>
                <th className="p-4 text-center">Төлөв</th>
                {canEdit && <th className="p-4 text-center">Үйлдэл</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-slate-500">
                    Хайлтад тохирох бараа олдсонгүй.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.stockQuantity <= prod.minStockLevel;
                  const isCritical = prod.stockQuantity <= Math.max(1, Math.floor(prod.minStockLevel / 2));

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                            {prod.sku}
                          </span>
                          <span className="font-bold">{prod.name}</span>
                        </div>
                        {prod.description && (
                          <div className="text-[11px] text-slate-500 mt-1 max-w-md truncate">
                            {prod.description}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {prod.category?.name || 'Бусад'}
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-slate-900">
                        {prod.unitPrice.toLocaleString()}₮
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-sm">
                        <span className={isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                          {prod.stockQuantity} ширхэг
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-sm text-blue-700 bg-blue-50/50">
                        {(Number(prod.unitPrice) * prod.stockQuantity).toLocaleString()}₮
                      </td>

                      <td className="p-4 text-center">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> Нэн яаралтай
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Үлдэгдэл бага
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Хангалттай
                          </span>
                        )}
                      </td>

                      {canEdit && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setReplenishTarget(prod)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                              title="Татан авалт хийх"
                            >
                              <RefreshCw className="w-3 h-3" /> Татан авалт
                            </button>
                            {(isCritical || isLow) && currentUser.role === 'ADMIN' && (
                              <button
                                onClick={() => handleCreateRestockTask(prod)}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors disabled:opacity-50"
                                title="Татан авалтын даалгавар үүсгэх"
                              >
                                <ClipboardList className="w-3 h-3" /> Даалгавар өгөх
                              </button>
                            )}
                            {currentUser.role === 'ADMIN' && (
                              <button
                                onClick={() => handleEditClick(prod)}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                                title="Барааг засах"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Шинэ бараа бүртгэх
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {formSuccess}
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Код *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="д.г. SKU-MOT-909"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  {fieldErrors['sku'] && (
                    <p className="text-[10px] text-red-600 mt-1">{fieldErrors['sku'][0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Бараа / Материалын Төрөл *</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="FINISHED_GOOD">📦 Бэлэн бүтээгдэхүүн (Зарах бараа)</option>
                    <option value="RAW_MATERIAL">🥛 Түүхий эд материал (Орц)</option>
                    <option value="PACKAGING">📦 Сав баглаа боодол (Орц)</option>
                    <option value="AUXILIARY">🛠 Туслах материал (Орц)</option>
                    <option value="SUPPLY">⚙ Хангамжийн материал</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ангилал</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Сонгох...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хэмжих нэгж (кг, л, ш г.м)</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ш, кг, л, м2..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Барааны нэр *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Бүтээгдэхүүний бүтэн нэр..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
                {fieldErrors['name'] && (
                  <p className="text-[10px] text-red-600 mt-1">{fieldErrors['name'][0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Тайлбар</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Барааны шинж чанар, хэмжээ, техникийн үзүүлэлт..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Нэгж үнэ (₮) *</label>
                  <input
                    type="number"
                    step="1"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="120000"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  {fieldErrors['unitPrice'] && (
                    <p className="text-[10px] text-red-600 mt-1">{fieldErrors['unitPrice'][0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Анхны нөөц *</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="50"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  {fieldErrors['stockQuantity'] && (
                    <p className="text-[10px] text-red-600 mt-1">{fieldErrors['stockQuantity'][0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Доод үлдэгдэл (Анхааруулга)</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="5"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Бүртгэж байна...' : 'Бараа бүртгэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Replenish Stock */}
      {replenishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" /> Агуулахын үлдэгдэл нэмэх
              </h3>
              <button onClick={() => setReplenishTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReplenishStock} className="p-6 space-y-4">
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {formSuccess}
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Барааны нэр</div>
                <div className="text-sm font-bold text-slate-900">{replenishTarget.name}</div>
                <div className="text-xs font-mono text-blue-600">{replenishTarget.sku}</div>
                <div className="text-xs text-slate-600 pt-1">
                  Одоогийн агуулахын үлдэгдэл: <strong className="text-emerald-700">{replenishTarget.stockQuantity} ширхэг</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Үйлдэл *
                </label>
                <select
                  value={isAdjustment ? 'ADJUSTMENT' : 'INBOUND'}
                  onChange={(e) => setIsAdjustment(e.target.value === 'ADJUSTMENT')}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 font-bold mb-3"
                >
                  <option value="INBOUND">Бараа татан авалт (Орлого)</option>
                  <option value="ADJUSTMENT">Агуулахын тохируулга</option>
                </select>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Нэмэх (эсвэл хасах) тоо хэмжээ *
                </label>
                <input
                  type="number"
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono font-bold text-center mb-3"
                  required
                />
                <p className="text-[10px] text-slate-500 mb-3">Тохируулга хийж хасах бол хасах тэмдэгтэй (-5) бичнэ үү.</p>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Тайлбар
                </label>
                <input
                  type="text"
                  value={replenishNotes}
                  onChange={(e) => setReplenishNotes(e.target.value)}
                  placeholder={isAdjustment ? 'Жишээ нь: Эвдэрсэн барааг хасав' : 'Жишээ нь: БНХАУ-аас ирсэн ачаа'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplenishTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Нэмж байна...' : 'Үлдэгдэл нэмэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" /> Барааны мэдээлэл засах
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProduct} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                  <ShieldAlert className="w-4 h-4" /> {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> {formSuccess}
                </div>
              )}
              {editWarning && (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs font-semibold flex items-start gap-2 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{editWarning}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Non-editable SKU */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU (Код)</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Барааны нэр *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Нэгж үнэ (₮) *</label>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => {
                        setUnitPrice(e.target.value ? Number(e.target.value) : '');
                        setEditWarning(null); // Reset warning if they change the price again
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Босго үлдэгдэл *</label>
                    <input
                      type="number"
                      value={minStockLevel}
                      onChange={(e) => setMinStockLevel(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ангилал (Сонголт)</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    <option value="">-- Ангилал сонгох --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Тайлбар</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-xs text-slate-900 min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Болих
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Хадгалж байна...' : editWarning ? 'Анхааруулгыг зөвшөөрч Хадгалах' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

