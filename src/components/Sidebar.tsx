import React from 'react';
import { Building2, Package, ShoppingCart, Truck, ShieldAlert, History, X, FileText, ClipboardList, FileSpreadsheet, Boxes, Receipt } from 'lucide-react';
import { User } from '../types/wms';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  inactiveBranchCount: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  inactiveBranchCount,
  isOpen,
  setIsOpen,
}) => {
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: ['dashboard', 'tasks', 'inventory', 'materials', 'manufacturing', 'orders', 'deliveries', 'branches', 'categories', 'reports', 'expenses', 'users', 'audit'],
    FINANCE: ['dashboard', 'inventory', 'materials', 'manufacturing', 'orders', 'reports', 'expenses'],
    WAREHOUSE_WORKER: ['dashboard', 'tasks', 'inventory', 'materials', 'manufacturing', 'orders', 'reports'],
    DELIVERY_DRIVER: ['dashboard', 'tasks', 'deliveries'],
    PRODUCTION: ['dashboard', 'tasks', 'manufacturing']
  };

  const userPerms = (currentUser.permissions && currentUser.permissions.length > 0)
    ? currentUser.permissions
    : (DEFAULT_ROLE_PERMISSIONS[currentUser.role] || DEFAULT_ROLE_PERMISSIONS.ADMIN);

  const menuGroups = [
    {
      title: 'ҮНДСЭН',
      items: [
        { id: 'dashboard', icon: Building2, label: 'Хяналтын самбар', badge: inactiveBranchCount > 0 && currentUser.role === 'ADMIN' ? inactiveBranchCount : null, badgeColor: 'bg-amber-500' },
        { id: 'tasks', icon: ClipboardList, label: 'Ажлын төлөвлөгөө', iconColor: 'text-indigo-500' },
      ]
    },
    {
      title: 'АГУУЛАХ & БҮРТГЭЛ',
      items: [
        { id: 'inventory', icon: Package, label: 'Агуулах ба Бараа' },
        { id: 'materials', icon: Boxes, label: 'ТЭМ & Сав баглаа', iconColor: 'text-purple-500' },
        { id: 'categories', icon: Package, label: 'Ангилал', iconColor: 'text-orange-500' },
      ]
    },
    {
      title: 'БОРЛУУЛАЛТ & ТҮГЭЭЛТ',
      items: [
        { id: 'orders', icon: ShoppingCart, label: 'Салбарын захиалга' },
        { id: 'deliveries', icon: Truck, label: 'Хүргэлт & Түгээлт' },
        { id: 'branches', icon: ShieldAlert, label: 'Салбарын идэвх' },
      ]
    },
    {
      title: 'ҮЙЛДВЭРЛЭЛ & ТАЙЛАН',
      items: [
        { id: 'manufacturing', icon: FileSpreadsheet, label: 'Үйлдвэрлэл & Санхүү', iconColor: 'text-amber-500' },
        { id: 'expenses', icon: Receipt, label: 'Зардал бүртгэл', iconColor: 'text-indigo-400' },
        { id: 'reports', icon: FileText, label: 'Хөдөлгөөн & Тайлан', iconColor: 'text-emerald-500' },
      ]
    },
    {
      title: 'СИСТЕМ',
      items: [
        { id: 'users', icon: ShieldAlert, label: 'Ажилчдын удирдлага', iconColor: 'text-indigo-500' },
        { id: 'audit', icon: History, label: 'Аудит лог' },
      ]
    }
  ];

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => currentUser.role === 'ADMIN' || userPerms.includes(item.id))
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } shadow-2xl lg:shadow-none border-r border-slate-800`}
      >
        {/* Brand & Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => handleTabClick('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold tracking-tight text-sm">НОМАД ПРЕМИУМ ФҮҮДС</span>
              <span className="text-[10px] text-slate-400 font-medium">Удирдлагын систем</span>
            </div>
          </div>
          
          <button 
            className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-blue-500' : (item.iconColor || 'text-slate-500 group-hover:text-slate-400')
                      }`} />
                      {item.label}
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${item.badgeColor} animate-pulse`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
};
