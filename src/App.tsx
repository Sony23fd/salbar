import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { api } from './lib/api';
import { User, Branch, Product, Order, InactiveBranchAlert } from './types/wms';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { InventoryManager } from './components/InventoryManager';
import { MaterialManager } from './components/MaterialManager';
import { OrderManager } from './components/OrderManager';
import { BranchManager } from './components/BranchManager';
import { AuditLogExplorer } from './components/AuditLogExplorer';
import { TaskManager } from './components/TaskManager';
import { DeliveryModal } from './components/DeliveryModal';
import { CategoryManager } from './components/CategoryManager';
import { ReportsManager } from './components/ReportsManager';
import { UserManager } from './components/UserManager';
import { ManufacturingFinancials } from './components/ManufacturingFinancials';
import { ExpenseManager } from './components/ExpenseManager';
import { Login } from './components/Login';

const resolveInitialTab = (userRole?: string): string => {
  const hash = window.location.hash.replace('#', '');
  const saved = localStorage.getItem('activeTab');
  const candidate = hash || saved || 'dashboard';

  if (userRole === 'DELIVERY_DRIVER') {
    if (candidate !== 'deliveries' && candidate !== 'tasks') {
      return 'deliveries';
    }
  } else if (userRole === 'FINANCE') {
    const allowedForFinance = ['manufacturing', 'materials', 'reports', 'expenses', 'dashboard', 'inventory', 'orders'];
    if (!allowedForFinance.includes(candidate)) {
      return 'manufacturing';
    }
  } else if (userRole === 'WAREHOUSE_WORKER') {
    const adminOnly = ['branches', 'categories', 'users', 'audit'];
    if (adminOnly.includes(candidate)) {
      return 'dashboard';
    }
  } else if (userRole === 'PRODUCTION') {
    const allowedForProduction = ['manufacturing', 'dashboard', 'tasks'];
    if (!allowedForProduction.includes(candidate)) {
      return 'manufacturing';
    }
  }

  return candidate;
};

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inactiveAlerts, setInactiveAlerts] = useState<InactiveBranchAlert[]>([]);

  const [activeTab, setActiveTab] = useState<string>(() => resolveInitialTab());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<Order | null>(null);
  const [presetBranchOrder, setPresetBranchOrder] = useState<string | undefined>(undefined);

  const changeTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
  };

  const reloadData = async () => {
    try {
      const loadedUsers = await api.getUsers();
      const loadedBranches = await api.getBranches();
      const loadedProducts = await api.getProducts(true);
      const loadedOrders = await api.getOrders();
      const loadedInactive = await api.getInactiveBranches(7);
      await api.getCategories(true);

      setUsers(loadedUsers);
      setBranches(loadedBranches);
      setProducts(loadedProducts);
      setOrders(loadedOrders);
      setInactiveAlerts(loadedInactive);

      // Sync active currentUser state with updated DB record
      if (currentUser) {
        const matchingUser = loadedUsers.find(u => u.id === currentUser.id || u.email === currentUser.email);
        if (matchingUser) {
          setCurrentUser(matchingUser);
          localStorage.setItem('user', JSON.stringify(matchingUser));
        }
      }
    } catch (err: any) {
      if (err.message.includes('Unauthorized') || err.message.includes('No token provided')) {
        handleLogout();
      } else {
        console.error("Failed to load data:", err);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        
        const tabToSet = resolveInitialTab(user.role);
        setActiveTab(tabToSet);
        localStorage.setItem('activeTab', tabToSet);
        if (window.location.hash !== `#${tabToSet}`) {
          window.location.hash = tabToSet;
        }

        reloadData();
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTab(hash);
        localStorage.setItem('activeTab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // SSE Listener
  useEffect(() => {
    if (!currentUser) return;
    
    const token = localStorage.getItem('token');
    const source = new EventSource('/api/events');
    
    source.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === 'order_created') {
          toast.success(`Шинэ захиалга ирлээ! №${data.orderNumber} (${data.branchName})`, { duration: 5000, icon: '📦' });
          reloadData();
        } else if (type === 'order_status_updated') {
          toast.success(`Захиалга №${data.orderNumber} төлөв өөрчлөгдлөө: ${data.status}`, { icon: '🔄' });
          reloadData();
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };
    
    return () => source.close();
  }, [currentUser]);

  const handleLoginSuccess = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    
    const initialTab = resolveInitialTab(user.role);
    changeTab(initialTab);
    reloadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeTab');
    window.location.hash = '';
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleResetDatabase = () => {
    if (confirm('Агуулахын өгөгдлийн баазыг анхны хэвэнд нь оруулж шинэчлэх үү?')) {
      // db.resetDatabase();
      reloadData();
    }
  };

  const handleQuickOrderForBranch = (branchId: string) => {
    setPresetBranchOrder(branchId);
    changeTab('orders');
  };

  const handleSimulateActivity = (branchId: string) => {
    // db.setBranchLastActivity(branchId, 0); // set to now
    reloadData();
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const drivers = users.filter((u) => u.role === 'DELIVERY_DRIVER');

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: 'text-sm font-sans font-medium',
          duration: 3000,
        }} 
      />
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={changeTab}
        inactiveBranchCount={inactiveAlerts.length}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentUser={currentUser}
          allUsers={users}
          onSwitchUser={(u) => {
            // Deprecated, use logout instead
            handleLogout();
          }}
          onResetData={handleResetDatabase}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          activeTab={activeTab}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className={activeTab === 'tasks' ? 'w-full' : 'max-w-7xl mx-auto'}>
            {activeTab === 'dashboard' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <AdminDashboard
                orders={orders}
                products={products}
                branches={branches}
                inactiveAlerts={inactiveAlerts}
                currentUser={currentUser}
                onNavigateTab={changeTab}
                onOpenDeliveryModal={(ord) => setSelectedDeliveryOrder(ord)}
                onQuickOrder={handleQuickOrderForBranch}
                onSimulateActivity={handleSimulateActivity}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManager
                currentUser={currentUser}
                allUsers={users}
                onRefresh={reloadData}
                onNavigateTab={changeTab}
              />
            )}

            {activeTab === 'inventory' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <InventoryManager
                products={products}
                currentUser={currentUser}
                onRefresh={reloadData}
              />
            )}

            {activeTab === 'materials' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <MaterialManager
                products={products}
                currentUser={currentUser}
                onRefresh={reloadData}
              />
            )}

            {activeTab === 'manufacturing' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <ManufacturingFinancials
                currentUser={currentUser}
                onRefreshProducts={reloadData}
              />
            )}

            {activeTab === 'orders' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <OrderManager
                orders={orders}
                branches={branches}
                products={products}
                currentUser={users}
                activeUser={currentUser}
                onOpenDeliveryModal={(ord) => setSelectedDeliveryOrder(ord)}
                onRefresh={reloadData}
                presetBranchId={presetBranchOrder}
              />
            )}

            {activeTab === 'deliveries' && (
              <OrderManager
                orders={orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'PACKED' || o.status === 'DELIVERED')}
                branches={branches}
                products={products}
                currentUser={users}
                activeUser={currentUser}
                onOpenDeliveryModal={(ord) => setSelectedDeliveryOrder(ord)}
                onRefresh={reloadData}
              />
            )}

            {activeTab === 'branches' && currentUser.role === 'ADMIN' && (
              <BranchManager
                branches={branches}
                orders={orders}
                inactiveAlerts={inactiveAlerts}
                onQuickOrder={handleQuickOrderForBranch}
                onRefresh={reloadData}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'categories' && currentUser.role === 'ADMIN' && (
              <CategoryManager activeUser={currentUser} />
            )}

            {activeTab === 'users' && currentUser.role === 'ADMIN' && (
              <UserManager currentUser={currentUser} />
            )}

            {activeTab === 'reports' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <ReportsManager currentUser={currentUser} />
            )}

            {activeTab === 'audit' && currentUser.role === 'ADMIN' && <AuditLogExplorer orders={orders} products={products} />}
          </div>
        </main>
      </div>

      {/* Modal: Atomic Delivery Confirmation */}
      {selectedDeliveryOrder && (
        <DeliveryModal
          order={selectedDeliveryOrder}
          currentUser={currentUser}
          drivers={drivers}
          allProducts={products}
          onClose={() => setSelectedDeliveryOrder(null)}
          onSuccess={() => {
            reloadData();
          }}
        />
      )}
    </div>
  );
}
