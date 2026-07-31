import { User, Branch, Product, Order, Category } from '../types/wms';

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
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

  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`, { headers: getHeaders() });
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

  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`, { headers: getHeaders() });
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

  async replenishProduct(productId: string, quantityToAdd: number, userId: string, notes?: string, isAdjustment?: boolean): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/replenish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ productId, quantityToAdd, userId, notes, isAdjustment }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`, { headers: getHeaders() });
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
      throw new Error(err.error || 'Delivery confirmation failed');
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
  }
};
