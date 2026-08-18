import { User, Branch, Product, Order, Category, Task, TaskComment } from '../types/wms';

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async get(url: string): Promise<any> {
    const res = await fetch(`${API_BASE}${url}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json() };
  },
  async post(url: string, data?: any): Promise<any> {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json() };
  },
  async put(url: string, data?: any): Promise<any> {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json() };
  },
  async delete(url: string): Promise<any> {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json() };
  },

  async getExpiringBatches(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/inventory/expiring-batches`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getForecast(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/analytics/forecast`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addUser(data: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deactivateUser(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/users/${id}/deactivate`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getBranches(): Promise<Branch[]> {
    const res = await fetch(`${API_BASE}/branches`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addBranch(data: Partial<Branch>): Promise<Branch> {
    const res = await fetch(`${API_BASE}/branches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
    const res = await fetch(`${API_BASE}/branches/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deactivateBranch(id: string): Promise<Branch> {
    const res = await fetch(`${API_BASE}/branches/${id}/deactivate`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getBranchInventory(id: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/branches/${id}/inventory`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async adjustBranchInventory(id: string, data: { productId: string; quantityToDeduct: number; type: 'SALE' | 'RETURN'; notes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/branches/${id}/inventory/adjust`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getCategories(includeInactive: boolean = false): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories?includeInactive=${includeInactive}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addCategory(name: string, description?: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateCategory(id: string, name: string, description?: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deactivateCategory(id: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}/deactivate`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reactivateCategory(id: string): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}/reactivate`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getProducts(includeInactive: boolean = false): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products?includeInactive=${includeInactive}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deactivateProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}/deactivate`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reactivateProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}/reactivate`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async replenishProduct(productId: string, quantityToAdd: number, userId: string, notes?: string, isAdjustment?: boolean): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/replenish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ productId, quantityToAdd, userId, notes, isAdjustment }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async issueMaterials(items: { productId: string, quantity: number }[], notes: string, issueType: string): Promise<{ success: boolean, updatedCount: number }> {
    const res = await fetch(`${API_BASE}/inventory/issue`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items, notes, issueType }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getPaginatedOrders(page: number, limit: number): Promise<{ data: Order[], total: number, page: number, totalPages: number }> {
    const res = await fetch(`${API_BASE}/orders/paginated?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getOrderHistory(id: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/orders/${id}/history`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getOrderHistoryLogs(limit: number = 500): Promise<any[]> {
    const res = await fetch(`${API_BASE}/audit/order-history?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getPaginatedOrderHistories(page: number, limit: number): Promise<{ data: any[], total: number, page: number, totalPages: number }> {
    const res = await fetch(`${API_BASE}/order-histories/paginated?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createOrder(branchId: string, createdById: string, itemsInput: { productId: string; quantity: number }[], notes?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ branchId, createdById, itemsInput, notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async confirmDelivery(orderId: string, driverId: string, notes?: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/deliver`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ driverId, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || err.details || err.error || 'Delivery confirmation failed');
    }
    return res.json();
  },

  async changeOrderStatus(id: string, newStatus: string, changedById: string, notes?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ newStatus, changedById, notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getTransactions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reports/transactions`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getPaginatedTransactions(page: number, limit: number, search?: string, type?: string, startDate?: string, endDate?: string): Promise<{ data: any[], total: number, page: number, totalPages: number }> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (type && type !== 'ALL') params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const res = await fetch(`${API_BASE}/reports/transactions/paginated?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getInactiveBranches(thresholdDays = 7): Promise<any[]> {
    const branches = await this.getBranches();
    const nowTime = new Date().getTime();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

    return branches
      .filter((b) => {
        const lastActTime = new Date(b.lastActivityAt).getTime();
        return nowTime - lastActTime >= thresholdMs;
      })
      .map((b) => {
        const lastActTime = new Date(b.lastActivityAt).getTime();
        const diffMs = nowTime - lastActTime;
        const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return {
          branchId: b.id,
          branchName: b.name,
          location: b.location,
          lastActivityAt: b.lastActivityAt,
          daysInactive,
          contactPerson: b.contactPerson,
          email: b.email,
          phone: b.phone,
        };
      })
      .sort((a, b) => b.daysInactive - a.daysInactive);
  },

  // Task API
  async getTasks(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async addTaskComment(id: string, content: string): Promise<TaskComment> {
    const res = await fetch(`${API_BASE}/tasks/${id}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Manufacturing & Costing API
  async getBOMs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/boms`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async saveBOM(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/boms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteBOM(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/boms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDeboningLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/deboning-logs`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async saveDeboningLog(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/deboning-logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getLivestockLedgers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/livestock-ledgers`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async saveLivestockLedger(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/livestock-ledgers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getProcurements(startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/procurements${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createProcurement(data: { supplierName?: string; notes?: string; items: { productId: string; quantity: number; unitPrice: number }[] }): Promise<any> {
    const res = await fetch(`${API_BASE}/procurements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getProductionBatches(startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/production-batches${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createProductionBatch(data: {
    finishedProductId: string;
    quantityProduced: number;
    fixedOverheadCost?: number;
    normalScrapAmount?: number;
    abnormalScrapAmount?: number;
    notes?: string;
    checklistStatus?: string;
    scrapAnalysisAlert?: string;
    customIngredients?: { ingredientId: string; quantityUsed: number }[];
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/production-batches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getFinancialSummary(startDate?: string, endDate?: string): Promise<{
    inventoryValuation: Record<string, { count: number; totalQuantity: number; totalValue: number }>;
    finishedGoodsAnalysis: any[];
    summary: {
      totalProcurementAmount: number;
      totalMaterialsIssuedCost: number;
      totalFixedOverheadCost: number;
      totalNormalScrapLoss: number;
      totalAbnormalScrapLoss: number;
      totalScrapLoss: number;
      totalProductionCost: number;
      totalDeliveredRevenue: number;
      totalDeliveredBaseCost: number;
      totalDeliveredNetProfit: number;
      totalAdjustmentImpact: number;
    };
  }> {
    let url = `${API_BASE}/financial-summary`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getOrderStatuses() {
    const res = await fetch(`${API_BASE}/api/order-statuses`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSystemSetting(key: string) {
    const res = await fetch(`${API_BASE}/api/settings/system/${key}`, { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(await res.text());
    }
    return res.json();
  },

  async setSystemSetting(key: string, value: string) {
    const res = await fetch(`${API_BASE}/api/settings/system/${key}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createOrderStatus(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/order-statuses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateOrderStatus(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/order-statuses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteOrderStatus(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/order-statuses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

