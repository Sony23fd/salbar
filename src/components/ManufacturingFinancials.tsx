import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Product, MaterialType, User } from '../types/wms';
import { api } from '../lib/api';

import {
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Factory,
  Boxes,
  PieChart,
  Truck,
  RotateCcw,
  Info,
  ChevronRight,
  Eye,
  X,
  Calculator,
  Scissors,
  Home,
  ChevronDown
} from 'lucide-react';
import { PricingModelTab } from './PricingModelTab';

interface ManufacturingFinancialsProps {
  currentUser: User;
  onRefreshProducts?: () => void;
}

export const ManufacturingFinancials: React.FC<ManufacturingFinancialsProps> = ({
  currentUser,
  onRefreshProducts
}) => {
  const canViewFinancials = currentUser.role === 'ADMIN' || currentUser.role === 'FINANCE';
  const [activeTab, setActiveTab] = useState<'BREAKDOWN' | 'OPERATIONS' | 'VALUATION' | 'PRICING_MODEL'>(
    canViewFinancials ? 'BREAKDOWN' : 'OPERATIONS'
  );
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [productionBatches, setProductionBatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalFixedCost, setGlobalFixedCost] = useState<number>(0);

  // Date Range State for Financial Summary
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

  // Search & Selected Product for Detail Breakdown
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState<any>(null);

  // Modals state for Operations
  const [showBomModal, setShowBomModal] = useState(false);
  const [showProcurementModal, setShowProcurementModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);

  // Form States - BOM
  const [selectedFinishedProduct, setSelectedFinishedProduct] = useState('');
  const [bomItems, setBomItems] = useState<{ ingredientId: string; quantityPerUnit: number }[]>([]);
  const [bomVersion, setBomVersion] = useState('v1.0');
  const [bomPrepTime, setBomPrepTime] = useState<number>(0);
  const [bomCookTime, setBomCookTime] = useState<number>(0);
  const [bomShelfLife, setBomShelfLife] = useState<number>(0);
  const [bomInstructions, setBomInstructions] = useState('');
  const [bomSteps, setBomSteps] = useState<{ stepNumber: number; title: string; description: string; timeMinutes: number; equipmentNeeded: string[] }[]>([]);

  // Form States - Procurement
  const [procSupplier, setProcSupplier] = useState('');
  const [procNotes, setProcNotes] = useState('');
  const [procItems, setProcItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([]);

  // Form States - Production Batch
  const [prodFinishedProductId, setProdFinishedProductId] = useState('');
  const [prodQuantity, setProdQuantity] = useState<number>(100);
  const [prodOverhead, setProdOverhead] = useState<number>(0);
  const [prodNormalScrap, setProdNormalScrap] = useState<number>(0);
  const [prodAbnormalScrap, setProdAbnormalScrap] = useState<number>(0);
  const [prodNotes, setProdNotes] = useState('');
  const [prodChecklist, setProdChecklist] = useState<any[]>([]);
  const [prodScrapAlert, setProdScrapAlert] = useState<boolean>(false);
  const [prodCustomIngredients, setProdCustomIngredients] = useState<{ ingredientId: string; quantityUsed: number, standardQuantity: number, name: string, unit: string }[]>([]);

  useEffect(() => {
    if (prodFinishedProductId) {
      const bom = boms.find(b => b.finishedProductId === prodFinishedProductId);
      if (bom && bom.items) {
        setProdCustomIngredients(bom.items.map((item: any) => {
          const product = products.find(p => p.id === item.ingredientId);
          const stdQty = parseFloat((item.quantityPerUnit * (prodQuantity || 0)).toFixed(4));
          return {
            ingredientId: item.ingredientId,
            name: product?.name || 'Тодорхойгүй',
            unit: product?.unit || 'кг',
            standardQuantity: stdQty,
            quantityUsed: stdQty
          };
        }));
      } else {
        setProdCustomIngredients([]);
      }
    } else {
      setProdCustomIngredients([]);
    }
  }, [prodFinishedProductId, prodQuantity, boms, products]);

  // Form States - Quick Material Creation
  const [showQuickMaterialModal, setShowQuickMaterialModal] = useState(false);
  const [matName, setMatName] = useState('');
  const [matSku, setMatSku] = useState('');
  const [matType, setMatType] = useState<MaterialType>('RAW_MATERIAL');
  const [matUnitPrice, setMatUnitPrice] = useState<number | ''>(0);
  const [matUnit, setMatUnit] = useState('кг');

  const isAdminOrWorker = currentUser.role === 'ADMIN' || currentUser.role === 'WAREHOUSE_WORKER' || currentUser.role === 'FINANCE';

  const handleQuickCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName) return;
    try {
      const generatedSku = matSku || `MAT-${Date.now().toString().slice(-6)}`;
      await api.addProduct({
        name: matName,
        sku: generatedSku,
        materialType: matType,
        unitPrice: Number(matUnitPrice) || 0,
        costPrice: Number(matUnitPrice) || 0,
        stockQuantity: 0,
        minStockLevel: 0,
        unit: matUnit || 'ш',
        isActive: true
      });
      toast.success(`Шинэ материал '${matName}' амжилттай бүртгэгдлээ.`);
      setShowQuickMaterialModal(false);
      setMatName('');
      setMatSku('');
      setMatUnitPrice(0);
      loadAllData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const prods = await api.getProducts();
      setProducts(prods);

      try {
        const finData = await api.getFinancialSummary(startDate, endDate);
        setFinancialData(finData);
      } catch (e) {
        setFinancialData(null);
      }

      try {
        const [bData, procData, batchData, catData, settingsData] = await Promise.all([
          api.getBOMs(),
          api.getProcurements(startDate, endDate),
          api.getProductionBatches(startDate, endDate),
          api.get('/categories').then(res => res.data),
          api.getSettings().catch(() => ({}))
        ]);
        setBoms(bData);
        setProcurements(procData);
        setProductionBatches(batchData);
        setCategories(catData || []);
        if (settingsData && settingsData.TOTAL_MONTHLY_FIXED_COST) {
          setGlobalFixedCost(Number(settingsData.TOTAL_MONTHLY_FIXED_COST) || 0);
        }
      } catch (e) {
        setBoms([]);
        setProcurements([]);
        setProductionBatches([]);
      }
    } catch (err) {
      console.error('Failed to load products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [startDate, endDate]);

  // Material type Mongolian titles
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

  // Filtered Finished Goods Analysis
  const filteredGoods = useMemo(() => {
    if (!financialData?.finishedGoodsAnalysis) return [];
    return financialData.finishedGoodsAnalysis.filter((g: any) => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [financialData, searchQuery]);

  // Live BOM Cost Calculation Preview
  const liveBomCostPreview = useMemo(() => {
    let rawCost = 0;
    let pkgCost = 0;
    let auxCost = 0;

    bomItems.forEach((bItem) => {
      const prod = products.find(p => p.id === bItem.ingredientId);
      if (prod) {
        const price = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : Number(prod.unitPrice);
        const lineTotal = bItem.quantityPerUnit * price;
        const mType = prod.materialType || 'RAW_MATERIAL';

        if (mType === 'RAW_MATERIAL') rawCost += lineTotal;
        else if (mType === 'PACKAGING') pkgCost += lineTotal;
        else auxCost += lineTotal;
      }
    });

    const targetProduct = products.find(p => p.id === selectedFinishedProduct);
    const sellingPrice = targetProduct ? Number(targetProduct.unitPrice) : 0;
    const totalEstCost = rawCost + pkgCost + auxCost;
    const estProfit = sellingPrice - totalEstCost;
    const estMargin = sellingPrice > 0 ? (estProfit / sellingPrice) * 100 : 0;

    return { rawCost, pkgCost, auxCost, totalEstCost, sellingPrice, estProfit, estMargin };
  }, [bomItems, products, selectedFinishedProduct]);

  // Handle BOM Submit
  const handleSaveBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinishedProduct || bomItems.length === 0) {
      toast.error('Бэлэн бүтээгдэхүүн болон доод тал нь 1 орц сонгоно уу.');
      return;
    }
    try {
      await api.saveBOM({
        finishedProductId: selectedFinishedProduct,
        items: bomItems,
        version: bomVersion,
        preparationTimeMinutes: bomPrepTime,
        cookingTimeMinutes: bomCookTime,
        shelfLifeDays: bomShelfLife,
        instructions: bomInstructions,
        steps: bomSteps
      });
      toast.success('Бүтээгдэхүүний Орц (BOM) амжилттай хадгалагдаж, нэгж өртөг шинэчлэгдлээ.');
      setShowBomModal(false);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  // Handle Procurement Submit
  const handleSaveProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procItems.length === 0) {
      toast.error('Татан авах материал сонгоно уу.');
      return;
    }
    try {
      await api.createProcurement({
        supplierName: procSupplier || 'Нийт ТЭМ & Сав баглаа татан авалт',
        notes: procNotes,
        items: procItems
      });
      toast.success('Түүхий эд, Сав баглаа материалын татан авалт амжилттай бүртгэгдэж, агуулахын үлдэгдэл болон нэгж өртөг шинэчлэгдлээ.');
      setShowProcurementModal(false);
      setProcSupplier('');
      setProcNotes('');
      setProcItems([]);
      loadAllData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  // Handle Production Batch Submit
  const handleSaveProductionBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFinishedProductId || prodQuantity <= 0) {
      toast.success('Үйлдвэрлэх бэлэн бүтээгдэхүүн болон хэмжээг оруулна уу.');
      return;
    }
    try {
      await api.createProductionBatch({
        finishedProductId: prodFinishedProductId,
        quantityProduced: prodQuantity,
        fixedOverheadCost: prodOverhead,
        normalScrapAmount: prodNormalScrap,
        abnormalScrapAmount: prodAbnormalScrap,
        notes: prodNotes,
        checklistStatus: JSON.stringify(prodChecklist),
        scrapAnalysisAlert: prodScrapAlert ? 'true' : 'false',
        customIngredients: prodCustomIngredients.length > 0 ? prodCustomIngredients.map(i => ({ ingredientId: i.ingredientId, quantityUsed: i.quantityUsed })) : undefined
      });
      toast.success('Үйлдвэрлэлийн бүртгэл амжилттай хийгдэж, орцын ТЭМ/Сав баглаа хасагдан, нэгж бодит өртөг бодогдон агуулахад хүлээн авагдлаа.');
      setShowProductionModal(false);
      setProdFinishedProductId('');
      setProdQuantity(100);
      setProdOverhead(0);
      setProdNormalScrap(0);
      setProdAbnormalScrap(0);
      setProdNotes('');
      loadAllData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>Санхүүгийн тооцооллыг ачааллаж байна...</span>
      </div>
    );
  }

  const { summary, inventoryValuation } = financialData || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            Барааны Орц & Үйлдвэрлэлийн Өртөг, Санхүүгийн Тооцоо
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Нэгж бүтээгдэхүүний ТЭМ, Сав баглаа, Туслах материалын орцын задрал болон бодит үйлдвэрлэлийн өртөг, маржин ашгийн тайлан
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-end gap-3">
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
          </div>

          {isAdminOrWorker && (
            <div className="flex items-center justify-end gap-3 flex-wrap">
              {/* Group 1: Materials & Inventory */}
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-xs">
                  <Boxes className="w-4 h-4" /> ТЭМ & Агуулах <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                  <div className="p-1">
                    <button
                      onClick={() => setShowQuickMaterialModal(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                        <Plus className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      Шинэ ТЭМ / Сав баглаа бүртгэх
                    </button>
                    <button
                      onClick={() => setShowProcurementModal(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left mt-1"
                    >
                      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                        <Truck className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      ТЭМ & Сав баглаа татан авах
                    </button>
                  </div>
                </div>
              </div>

              {/* Group 2: Manufacturing */}
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs">
                  <Factory className="w-4 h-4" /> Үйлдвэрлэл <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                  <div className="p-1">
                    <button
                      onClick={() => setShowBomModal(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        <Settings className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      Орц (BOM) тохируулах
                    </button>
                    <button
                      onClick={() => setShowProductionModal(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left mt-1"
                    >
                      <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                        <Factory className="w-3.5 h-3.5 text-blue-700" />
                      </div>
                      Үйлдвэрлэл бүртгэх
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
        {canViewFinancials && (
          <button
            onClick={() => setActiveTab('BREAKDOWN')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'BREAKDOWN'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" /> Барааны Орц & Өртөг Тооцоолол
          </button>
        )}


        {canViewFinancials && (
          <button
            onClick={() => setActiveTab('VALUATION')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'VALUATION'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" /> Материал & Үлдэгдлийн Үнэлгээ
          </button>
        )}

        {canViewFinancials && (
          <button
            onClick={() => setActiveTab('PRICING_MODEL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'PRICING_MODEL'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" /> Үнийн бодолт (Хүчин чадлаар)
          </button>
        )}

        <button
          onClick={() => setActiveTab('OPERATIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'OPERATIONS'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Factory className="w-4 h-4" /> Жор, Татан авалт & Үйлдвэрлэл Түүх
        </button>

        
      </div>

      

      {/* TAB 1: PER-PRODUCT INGREDIENT & COST BREAKDOWN */}
      {activeTab === 'BREAKDOWN' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Үйлдвэрлэх Бэлэн Бараа</div>
                <div className="text-xl font-black text-slate-900">{financialData?.finishedGoodsAnalysis?.length || 0} төрөл</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Боломжит Борлуулалтын Орлого</div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  ₮{(financialData?.finishedGoodsAnalysis || []).reduce((s: number, g: any) => s + g.totalStockRevenuePotential, 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Боломжит Цэвэр Маржин Ашиг</div>
                <div className="text-xl font-black text-purple-700 font-mono">
                  ₮{(financialData?.finishedGoodsAnalysis || []).reduce((s: number, g: any) => s + g.totalStockMarginPotential, 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Үлдэгдэл Бэлэн Барааны Өртөг</div>
                <div className="text-xl font-black text-amber-700 font-mono">
                  ₮{(financialData?.finishedGoodsAnalysis || []).reduce((s: number, g: any) => s + g.totalStockValue, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Бүтээгдэхүүн хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-xs"
            />
          </div>

          {/* Detailed Table for Product Production Cost & Ingredients */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Бүтээгдэхүүн тус бүрийн Өртгийн Задрал (ТЭМ, Сав баглаа) & Ашиг</h3>
                <p className="text-xs text-slate-500">Бараа бүрийн мөрөн дээр дарж орцын дэлгэрэнгүй задралыг харна уу.</p>
              </div>
              <span className="text-xs text-slate-500">Нийт: <strong>{filteredGoods.length}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase">Бүтээгдэхүүн / SKU</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">ТЭМ Орцын Дүн</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Сав баглаа Дүн</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нэгж Бодит Өртөг</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Борлуулах Үнэ</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нэгж Маржин Ашиг</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Ашгийн %</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-center">Орцын задрал</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGoods.map((item: any) => {
                    const isProfit = item.unitMarginProfit >= 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedProductDetail(item)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{item.sku} • Үлдэгдэл: {item.stockQuantity} {item.unit}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-amber-800">
                          ₮{(item.rawMaterialCost || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-purple-800">
                          ₮{(item.packagingCost || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          ₮{item.unitCostPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700">
                          ₮{item.unitSellingPrice.toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                          ₮{item.unitMarginProfit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            isProfit ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {item.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductDetail(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Задрал харах
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGoods.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        Бүтээгдэхүүний өгөгдөл олдсонгүй.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* TAB 3: INVENTORY VALUATION BY MATERIAL CATEGORY */}
      {activeTab === 'VALUATION' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                Түүхий эд, Сав баглаа, Бэлэн бүтээгдэхүүн, Хангамжийн туслах материалуудын үлдэгдэл
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Ангилал тус бүрийн агуулах дахь нийт тоо хэмжээ болон үнийн дүнгийн нэгдсэн тайлан
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(['RAW_MATERIAL', 'PACKAGING', 'AUXILIARY', 'SUPPLY', 'FINISHED_GOOD'] as MaterialType[]).map((type) => {
              const val = inventoryValuation?.[type] || { count: 0, totalQuantity: 0, totalValue: 0 };
              return (
                <div key={type} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${materialTypeBadges[type]}`}>
                    {materialTypeNames[type]}
                  </span>
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase">Нийт үлдэгдэл үнэ</div>
                    <div className="text-lg font-black text-slate-900 font-mono">₮{val.totalValue.toLocaleString()}</div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span>Нэр төрөл: <strong>{val.count}</strong></span>
                    <span>Тоо: <strong>{val.totalQuantity}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Products Valuation Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-sm text-slate-800">
              Бүх Материал & Бүтээгдэхүүний Үлдэгдлийн Жагсаалт
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase">Материал / Бараа</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase">Төрөл</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Үлдэгдэл тоо</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нэгж үнэ/өртөг</th>
                    <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Нийт үнэлгээний дүн</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const mType = (p.materialType || 'FINISHED_GOOD') as MaterialType;
                    const price = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.unitPrice);
                    const totalVal = p.stockQuantity * price;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {p.name}
                          <div className="text-xs text-slate-500 font-mono font-normal">{p.sku}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${materialTypeBadges[mType]}`}>
                            {materialTypeNames[mType]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {p.stockQuantity} {p.unit || 'ш'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          ₮{price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                          ₮{totalVal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OPERATIONS */}
      {activeTab === 'OPERATIONS' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BOMs List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-700" /> Үйлдвэрлэлийн Жор (BOM)
                </h3>
                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">{boms.length}</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {boms.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="font-bold text-xs text-slate-900">{b.finishedProduct?.name}</div>
                    <div className="text-[11px] text-slate-500">Орцын тоо: {b.items?.length || 0} төрөл</div>
                  </div>
                ))}
                {boms.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">BOM Жор тохируулаагүй байна.</div>}
              </div>
            </div>

            {/* Procurements List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" /> ТЭМ & Сав баглаа татан авалт
                </h3>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{procurements.length}</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {procurements.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-900">{p.procurementNo}</span>
                      <span className="font-mono text-emerald-700">₮{Number(p.totalAmount).toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{p.supplierName || 'Нийт татан авалт'} • {new Date(p.createdAt).toLocaleDateString('mn-MN')}</div>
                  </div>
                ))}
                {procurements.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">Татан авалт бүртгэгдээгүй байна.</div>}
              </div>
            </div>

            {/* Production Batches List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-blue-600" /> Үйлдвэрлэсэн Парцууд
                </h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{productionBatches.length}</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {productionBatches.map((pb) => (
                  <div key={pb.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-900">{pb.batchNumber}</span>
                      <span className="font-mono text-blue-700">{pb.quantityProduced} ш</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold">{pb.finishedProduct?.name}</div>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-200/50">
                      <span>Өртөг: ₮{Number(pb.calculatedUnitCost).toLocaleString()}/нэгж</span>
                      <span>{new Date(pb.createdAt).toLocaleDateString('mn-MN')}</span>
                    </div>
                  </div>
                ))}
                {productionBatches.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">Үйлдвэрлэл ажиллаагүй байна.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT COST BREAKDOWN DETAIL MODAL */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  Нэгж Бүтээгдэхүүний Өртгийн Карт
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedProductDetail.name}</h3>
                <p className="text-xs text-slate-500 font-mono">SKU: {selectedProductDetail.sku} • Агуулахын үлдэгдэл: {selectedProductDetail.stockQuantity} {selectedProductDetail.unit}</p>
              </div>
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Cards inside Detail Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
                <div className="text-amber-800 font-bold text-[10px] uppercase">ТЭМ Орцын өртөг</div>
                <div className="text-base font-black font-mono text-amber-900">₮{(selectedProductDetail.rawMaterialCost || 0).toLocaleString()}</div>
              </div>
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200/60">
                <div className="text-purple-800 font-bold text-[10px] uppercase">Сав баглааны өртөг</div>
                <div className="text-base font-black font-mono text-purple-900">₮{(selectedProductDetail.packagingCost || 0).toLocaleString()}</div>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                <div className="text-slate-600 font-bold text-[10px] uppercase">Нэгж Бодит Өртөг</div>
                <div className="text-base font-black font-mono text-slate-900">₮{(selectedProductDetail.unitCostPrice || 0).toLocaleString()}</div>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60">
                <div className="text-emerald-800 font-bold text-[10px] uppercase">Нэгж Маржин Ашиг</div>
                <div className="text-base font-black font-mono text-emerald-900">₮{(selectedProductDetail.unitMarginProfit || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Ingredient List Table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" /> Орцын Нарийвчилсан Задрал (1 Нэгжид)
                </h4>
                <button
                  onClick={() => {
                    setSelectedFinishedProduct(selectedProductDetail.id);
                    const existing = boms.find(b => b.finishedProductId === selectedProductDetail.id);
                    if (existing && existing.items) {
                      setBomItems(existing.items.map((i: any) => ({ ingredientId: i.ingredientId, quantityPerUnit: i.quantityPerUnit })));
                    } else {
                      setBomItems([]);
                    }
                    setSelectedProductDetail(null);
                    setShowBomModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" /> Жор (BOM) Засах
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="px-3 py-2">Материал / Орц</th>
                      <th className="px-3 py-2">Төрөл</th>
                      <th className="px-3 py-2 text-right">1 нэгжид олон тоо</th>
                      <th className="px-3 py-2 text-right">Материалын нэгж өртөг</th>
                      <th className="px-3 py-2 text-right">Орноос хамаарах өртөг</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {(selectedProductDetail.bomDetails || []).map((b: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="px-3 py-2 font-bold text-slate-900">{b.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${materialTypeBadges[b.materialType as MaterialType] || 'bg-slate-100'}`}>
                            {materialTypeNames[b.materialType as MaterialType] || b.materialType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{b.quantityPerUnit} {b.unit}</td>
                        <td className="px-3 py-2 text-right font-mono">₮{b.unitCost.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">₮{b.lineCost.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!selectedProductDetail.bomDetails || selectedProductDetail.bomDetails.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-500">
                          Энэ бараанд Орц (BOM) Жор тохируулаагүй байна. "Жор Засах" товчоор тохируулна уу.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BOM SETTINGS & REALTIME COST CALCULATOR */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" /> Бүтээгдэхүүний Орц (BOM) & Өртгийн Калькулятор
            </h3>

            <form onSubmit={handleSaveBOM} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Үйлдвэрлэх Бэлэн Бүтээгдэхүүн Сонгох *</label>
                <select
                  value={selectedFinishedProduct}
                  onChange={(e) => {
                    setSelectedFinishedProduct(e.target.value);
                    const existing = boms.find(b => b.finishedProductId === e.target.value);
                    if (existing) {
                      if (existing.items) {
                        setBomItems(existing.items.map((i: any) => ({ ingredientId: i.ingredientId, quantityPerUnit: i.quantityPerUnit })));
                      } else {
                        setBomItems([]);
                      }
                      setBomVersion(existing.version || 'v1.0');
                      setBomPrepTime(existing.preparationTimeMinutes || 0);
                      setBomCookTime(existing.cookingTimeMinutes || 0);
                      setBomShelfLife(existing.shelfLifeDays || 0);
                      setBomInstructions(existing.instructions || '');
                      setBomSteps(existing.steps || []);
                    } else {
                      setBomItems([]);
                      setBomVersion('v1.0');
                      setBomPrepTime(0);
                      setBomCookTime(0);
                      setBomShelfLife(0);
                      setBomInstructions('');
                      setBomSteps([]);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  required
                >
                  <option value="">-- Сонгох --</option>
                  {products.filter(p => p.materialType === 'FINISHED_GOOD' || !p.materialType).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              {/* Real-time Live Cost Preview Card */}
              {selectedFinishedProduct && (
                <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-blue-600" /> Тооцоологдсон Өртгийн Урьдчилсан Тооцоо
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ТЭМ:</span>
                      <strong className="font-mono text-amber-800">₮{liveBomCostPreview.rawCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Сав баглаа:</span>
                      <strong className="font-mono text-purple-800">₮{liveBomCostPreview.pkgCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Нэгж Өртөг:</span>
                      <strong className="font-mono text-slate-900">₮{liveBomCostPreview.totalEstCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Ашгийн Маржин %:</span>
                      <strong className={`font-mono ${liveBomCostPreview.estMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {liveBomCostPreview.estMargin.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Орох Түүхий эд, Сав баглаа, Туслах материал (1 нэгжид)</label>
                  <button
                    type="button"
                    onClick={() => setBomItems([...bomItems, { ingredientId: '', quantityPerUnit: 1 }])}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Орц нэмэх
                  </button>
                </div>

                <div className="space-y-2">
                  {bomItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.ingredientId}
                        onChange={(e) => {
                          const newItems = [...bomItems];
                          newItems[idx].ingredientId = e.target.value;
                          setBomItems(newItems);
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        required
                      >
                        <option value="">-- Материал сонгох --</option>
                        {products.filter(p => p.materialType !== 'FINISHED_GOOD').map(p => (
                          <option key={p.id} value={p.id}>[{materialTypeNames[p.materialType || 'RAW_MATERIAL']}] {p.name} ({p.unit || 'ш'})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Хэмжээ"
                        value={item.quantityPerUnit}
                        onChange={(e) => {
                          const newItems = [...bomItems];
                          newItems[idx].quantityPerUnit = parseFloat(e.target.value) || 0;
                          setBomItems(newItems);
                        }}
                        className="w-28 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {bomItems.length === 0 && (
                    <div className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-xl">
                      Одоогийн байдлаар орц сонгоогүй байна.
                    </div>
                  )}
                </div>
              </div>

              {/* Tech Card Extended Fields */}
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-blue-600"/> Технологийн Картын Мэдээлэл</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Хувилбар (Version)</label>
                    <input type="text" value={bomVersion} onChange={e => setBomVersion(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Бэлтгэх хугацаа (мин)</label>
                    <input type="number" value={bomPrepTime} onChange={e => setBomPrepTime(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Боловсруулах хугацаа (мин)</label>
                    <input type="number" value={bomCookTime} onChange={e => setBomCookTime(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Хадгалах хугацаа (хоног)</label>
                    <input type="number" value={bomShelfLife} onChange={e => setBomShelfLife(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ерөнхий зааварчилгаа</label>
                  <textarea value={bomInstructions} onChange={e => setBomInstructions(e.target.value)} rows={2} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900" placeholder="Үйлдвэрлэх ерөнхий дараалал..."></textarea>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700">Технологийн Алхмууд</label>
                    <button
                      type="button"
                      onClick={() => setBomSteps([...bomSteps, { stepNumber: bomSteps.length + 1, title: '', description: '', timeMinutes: 0, equipmentNeeded: [] }])}
                      className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Алхам нэмэх
                    </button>
                  </div>
                  <div className="space-y-2">
                    {bomSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 mt-2">#{idx + 1}</span>
                        <div className="flex-1 space-y-2">
                          <input type="text" placeholder="Алхмын нэр" value={step.title} onChange={e => { const s = [...bomSteps]; s[idx].title = e.target.value; setBomSteps(s); }} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                          <textarea placeholder="Дэлгэрэнгүй тайлбар..." value={step.description} onChange={e => { const s = [...bomSteps]; s[idx].description = e.target.value; setBomSteps(s); }} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs" rows={1}></textarea>
                          <div className="flex gap-2">
                            <input type="number" placeholder="Хугацаа (мин)" value={step.timeMinutes || ''} onChange={e => { const s = [...bomSteps]; s[idx].timeMinutes = Number(e.target.value); setBomSteps(s); }} className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                            <input type="text" placeholder="Тоног төхөөрөмж (таслалаар)" value={step.equipmentNeeded.join(',')} onChange={e => { const s = [...bomSteps]; s[idx].equipmentNeeded = e.target.value.split(','); setBomSteps(s); }} className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs" />
                          </div>
                        </div>
                        <button type="button" onClick={() => setBomSteps(bomSteps.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-1">&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Орц (BOM) Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MATERIAL PROCUREMENT (RECEIPT) MODAL */}
      {showProcurementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" /> Түүхий эд & Сав баглаа материал хүлээн авах (Татан авалт)
            </h3>

            <form onSubmit={handleSaveProcurement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Татан авалтын тэмдэглэл / Баримт</label>
                <input
                  type="text"
                  placeholder="Жишээ нь: 1-р улирлын сүү, хайрцаг татан авалт"
                  value={procNotes}
                  onChange={(e) => setProcNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Авсан ТЭМ / Сав баглаа / Туслах материалууд</label>
                  <button
                    type="button"
                    onClick={() => setProcItems([...procItems, { productId: '', quantity: 100, unitPrice: 1000 }])}
                    className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Материал нэмэх
                  </button>
                </div>

                <div className="space-y-2">
                  {procItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const newItems = [...procItems];
                          newItems[idx].productId = e.target.value;
                          setProcItems(newItems);
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                        required
                      >
                        <option value="">-- Материал сонгох --</option>
                        {products.filter(p => p.materialType !== 'FINISHED_GOOD').map(p => (
                          <option key={p.id} value={p.id}>[{materialTypeNames[p.materialType || 'RAW_MATERIAL']}] {p.name} ({p.unit || 'ш'})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="any"
                        placeholder="Тоо"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...procItems];
                          newItems[idx].quantity = parseFloat(e.target.value) || 0;
                          setProcItems(newItems);
                        }}
                        className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Нэгж авсан үнэ (₮)"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...procItems];
                          newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setProcItems(newItems);
                        }}
                        className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setProcItems(procItems.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {procItems.length === 0 && (
                    <div className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-xl">
                      Материал сонгоогүй байна.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProcurementModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Материал Хүлээн Авах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RUN PRODUCTION BATCH MODAL */}
      {showProductionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-blue-600" /> Үйлдвэрлэлийн Парц Бүртгэх & Өртөг Бодох
            </h3>

            <form onSubmit={handleSaveProductionBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Үйлдвэрлэх Бэлэн Бүтээгдэхүүн *</label>
                <select
                  value={prodFinishedProductId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    setProdFinishedProductId(productId);
                    const bom = boms.find(b => b.finishedProductId === productId);
                    if (bom && bom.steps) {
                      setProdChecklist(bom.steps.map((s: any) => ({ stepNumber: s.stepNumber, title: s.title, completed: false })));
                    } else {
                      setProdChecklist([]);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  required
                >
                  <option value="">-- Бэлэн бүтээгдэхүүн сонгох --</option>
                  {products.filter(p => p.materialType === 'FINISHED_GOOD' || !p.materialType).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Үйлдвэрлэсэн Хэмжээ *</label>
                  <input
                    type="number"
                    step="any"
                    value={prodQuantity}
                    onChange={(e) => setProdQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Тогтмол зардал (₮)</label>
                  <input
                    type="number"
                    placeholder="Цалин, цахилгаан г.м"
                    value={prodOverhead}
                    onChange={(e) => setProdOverhead(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хувийн (Нормт) хорогдол (₮)</label>
                  <input
                    type="number"
                    placeholder="Нормт хорогдол"
                    value={prodNormalScrap}
                    onChange={(e) => setProdNormalScrap(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
                    Хувийн бус хорогдол (₮)
                    <div className="flex items-center gap-1 mt-0.5">
                      <input type="checkbox" checked={prodScrapAlert} onChange={e => setProdScrapAlert(e.target.checked)} className="w-3 h-3 text-red-600 rounded border-slate-300" />
                      <span className="text-[10px] text-red-600 font-normal">Анхааруулга үүсгэх (Alert)</span>
                    </div>
                  </label>
                  <input
                    type="number"
                    placeholder="Нормт бус алдагдал"
                    value={prodAbnormalScrap}
                    onChange={(e) => setProdAbnormalScrap(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-red-600"
                  />
                </div>
              </div>

              {prodCustomIngredients.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Boxes className="w-4 h-4 text-purple-600"/> Орц материалын зарцуулалт (Хорогдол бүртгэх)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="pb-2 font-medium">Материал</th>
                          <th className="pb-2 font-medium text-right">Стандарт орц</th>
                          <th className="pb-2 font-medium text-right">Хорогдол нэмэх</th>
                          <th className="pb-2 font-medium text-right">Нийт зарцуулалт</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prodCustomIngredients.map((item, idx) => {
                          const scrap = parseFloat((item.quantityUsed - item.standardQuantity).toFixed(4));
                          return (
                            <tr key={item.ingredientId}>
                              <td className="py-2 font-medium text-slate-800">{item.name}</td>
                              <td className="py-2 text-right text-slate-600">{item.standardQuantity.toLocaleString()} {item.unit}</td>
                              <td className="py-2 text-right">
                                <div className="flex justify-end items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    className="w-20 px-2 py-1 text-right text-xs border border-slate-300 rounded focus:ring-1 focus:ring-purple-500"
                                    value={scrap === 0 ? '' : scrap}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const newIngredients = [...prodCustomIngredients];
                                      newIngredients[idx].quantityUsed = parseFloat((item.standardQuantity + val).toFixed(4));
                                      setProdCustomIngredients(newIngredients);
                                    }}
                                  />
                                  <span className="text-slate-500">{item.unit}</span>
                                </div>
                              </td>
                              <td className="py-2 text-right font-bold text-slate-800">
                                {item.quantityUsed.toLocaleString()} {item.unit}
                                {scrap > 0 && <span className="text-red-500 ml-1 text-[10px]">(+{scrap})</span>}
                                {scrap < 0 && <span className="text-green-500 ml-1 text-[10px]">({scrap})</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {prodChecklist.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600"/> Технологийн Картын Хяналтын Хуудас (Checklist)</h4>
                  <div className="space-y-2">
                    {prodChecklist.map((step, idx) => (
                      <label key={idx} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={e => {
                            const newChecklist = [...prodChecklist];
                            newChecklist[idx].completed = e.target.checked;
                            setProdChecklist(newChecklist);
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 mt-0.5"
                        />
                        <span className={`text-xs ${step.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                          Алхам {step.stepNumber}: {step.title || 'Тодорхойгүй алхам'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Тэмдэглэл / Парцын тайлбар</label>
                <textarea
                  rows={2}
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  placeholder="Ээлжийн мэдээлэл..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Үйлдвэрлэл Бүртгэж Өртөг Бодох
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'PRICING_MODEL' && (
        <PricingModelTab
          products={products}
          categories={categories}
          globalFixedCost={globalFixedCost}
          onRefresh={loadAllData}
        />
      )}
      {/* MODAL 4: QUICK MATERIAL CREATION MODAL */}
      {showQuickMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" /> Шинэ ТҮҮХИЙ ЭД эсвэл САВ БАГЛАА материал бүртгэх
              </h3>
              <button onClick={() => setShowQuickMaterialModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Материалын Төрөл *</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as MaterialType)}
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
                  placeholder="д.г: Сүү (Литрийн), Картон хайрцаг (Их)"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Хэмжих нэгж (кг, л, ш г.м)</label>
                  <input
                    type="text"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="кг, л, ш, м2..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Нэгж худалдан авах үнэ (₮)</label>
                  <input
                    type="number"
                    value={matUnitPrice}
                    onChange={(e) => setMatUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="1500"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickMaterialModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Материал Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
