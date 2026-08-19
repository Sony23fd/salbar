import React from 'react';
import { User, Role } from '../types/wms';
import { Building2, Package, ShoppingCart, Truck, ShieldAlert, FileCode, History, RefreshCw, UserCheck, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  inactiveBranchCount: number;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  activeTab,
  setActiveTab,
  inactiveBranchCount,
  onResetData,
}) => {
  const roleLabels: Record<Role, string> = {
    ADMIN: 'Админ',
    WAREHOUSE_WORKER: 'Агуулахын ажилтан',
    DELIVERY_DRIVER: 'Хүргэлтийн жолооч',
    FINANCE: 'Санхүү',
    PRODUCTION: 'Үйлдвэрлэл',
    DATA_ADMIN: 'Өгөгдлийн админ',
  };

  const roleBadgeColors: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    WAREHOUSE_WORKER: 'bg-blue-100 text-blue-700 border-blue-200',
    DELIVERY_DRIVER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    FINANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    PRODUCTION: 'bg-purple-100 text-purple-700 border-purple-200',
    DATA_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      {/* Top Banner & Role Switcher Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            WMS Систем идэвхтэй
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-400">PostgreSQL + Бараа материалын автомат бүртгэл</span>
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="flex items-center space-x-3">
          <span className="text-slate-300 font-medium hidden md:inline flex items-center gap-1 text-[11px]">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Эрх солих:
          </span>
          <div className="relative inline-block">
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = allUsers.find((u) => u.id === e.target.value);
                if (found) onSwitchUser(found);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({roleLabels[u.role]})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onResetData}
            title="Мэдээллийг шинэчлэх"
            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition-colors text-xs font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Өгөгдөл шинэчлэх</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation & Title Bar */}
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              НОМАД ПРЕМИУМ ФҮҮДС
            </h1>
            <p className="text-xs text-slate-500 font-medium">Агуулах ба Салбар хоорондын удирдлагын систем</p>
          </div>
        </div>

        {/* Current Active User Profile */}
        <div className="flex items-center space-x-3 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {currentUser.name.charAt(0)}
            </div>
          )}
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              {currentUser.name}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadgeColors[currentUser.role]}`}>
                {roleLabels[currentUser.role]}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">{currentUser.email}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Menu */}
      <div className="border-t border-slate-200 bg-slate-50/50">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Хяналтын самбар
            {inactiveBranchCount > 0 && currentUser.role === 'ADMIN' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-bounce">
                {inactiveBranchCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Агуулах ба Бараа
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Салбарын захиалга
          </button>

          <button
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'deliveries'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            Хүргэлт & Түгээлт
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'branches'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Салбарын идэвх
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Аудит лог
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-orange-500" />
              Ангилал
            </button>
          )}

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ml-auto ${
              activeTab === 'code'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4 text-purple-600" />
            Системийн код
          </button>
        </div>
      </div>
    </header>
  );
};

