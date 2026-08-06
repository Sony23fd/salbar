import React from 'react';
import { User, Role } from '../types/wms';
import { LogOut, RefreshCw, Menu } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onResetData: () => void;
  onToggleSidebar: () => void;
  activeTab: string;
}

const tabTitles: Record<string, string> = {
  dashboard: 'Хяналтын самбар',
  inventory: 'Агуулах ба Бараа',
  manufacturing: 'Үйлдвэрлэл & Санхүү',
  orders: 'Салбарын захиалга',
  deliveries: 'Хүргэлт & Түгээлт',
  branches: 'Салбарын идэвх',
  categories: 'Ангилал удирдах',
  audit: 'Аудит лог',
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  onResetData,
  onToggleSidebar,
  activeTab,
}) => {
  const roleLabels: Record<Role, string> = {
    ADMIN: 'Админ',
    WAREHOUSE_WORKER: 'Агуулахын ажилтан',
    DELIVERY_DRIVER: 'Хүргэлтийн жолооч',
  };

  const roleBadgeColors: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    WAREHOUSE_WORKER: 'bg-blue-100 text-blue-700 border-blue-200',
    DELIVERY_DRIVER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs w-full">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Систем идэвхтэй
          </span>
        </div>

        <div className="flex items-center space-x-3 ml-auto">
          <button
            onClick={onResetData}
            title="Өгөгдлийг шинэчлэх"
            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2 py-1 rounded-lg border border-slate-700 transition-colors text-[11px] font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Шинэчлэх</span>
          </button>
        </div>
      </div>

      {/* Main Header Area */}
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {tabTitles[activeTab] || 'WMS Систем'}
          </h1>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${roleBadgeColors[currentUser.role]}`}>
                {roleLabels[currentUser.role]}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => onSwitchUser(currentUser)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Гарах</span>
          </button>
        </div>
      </div>
    </header>
  );
};
