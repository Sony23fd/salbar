import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { User, Branch, Product, Order, InactiveBranchAlert } from './types/wms';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { InventoryManager } from './components/InventoryManager';
import { OrderManager } from './components/OrderManager';
import { BranchManager } from './components/BranchManager';
import { AuditLogExplorer } from './components/AuditLogExplorer';
import { TaskManager } from './components/TaskManager';
import { DeliveryModal } from './components/DeliveryModal';
import { CategoryManager } from './components/CategoryManager';
import { ReportsManager } from './components/ReportsManager';
import { UserManager } from './components/UserManager';
import { Login } from './components/Login';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inactiveAlerts, setInactiveAlerts] = useState<InactiveBranchAlert[]>([]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<Order | null>(null);
  const [presetBranchOrder, setPresetBranchOrder] = useState<string | undefined>(undefined);

  const reloadData = async () => {
    try {
      const loadedUsers = await api.getUsers();
      const loadedBranches = await api.getBranches();
      const loadedProducts = await api.getProducts();
      const loadedOrders = await api.getOrders();
      const loadedInactive = await api.getInactiveBranches(7);

      setUsers(loadedUsers);
      setBranches(loadedBranches);
      setProducts(loadedProducts);
      setOrders(loadedOrders);
      setInactiveAlerts(loadedInactive);

      if (!currentUser && loadedUsers.length > 0) {
        setCurrentUser(loadedUsers[0]);
      }
    } catch (err: any) {
      if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
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
        if (user.role === 'DELIVERY_DRIVER' && activeTab === 'dashboard') {
          setActiveTab('deliveries');
        }
        reloadData();
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLoginSuccess = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === 'DELIVERY_DRIVER') {
      setActiveTab('deliveries');
    } else {
      setActiveTab('dashboard');
    }
    reloadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    setActiveTab('orders');
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
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
                onNavigateTab={setActiveTab}
                onOpenDeliveryModal={(ord) => setSelectedDeliveryOrder(ord)}
                onQuickOrder={handleQuickOrderForBranch}
                onSimulateActivity={handleSimulateActivity}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManager currentUser={currentUser} allUsers={users} />
            )}

            {activeTab === 'inventory' && currentUser.role !== 'DELIVERY_DRIVER' && (
              <InventoryManager
                products={products}
                currentUser={currentUser}
                onRefresh={reloadData}
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
              <ReportsManager />
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
