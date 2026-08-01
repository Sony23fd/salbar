// ==========================================
// Types & Interfaces: WMS Domain Models
// ==========================================

export type Role = 'ADMIN' | 'WAREHOUSE_WORKER' | 'DELIVERY_DRIVER';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PACKED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  createdAt: string;
}

export type BranchType = 'BRANCH' | 'CUSTOMER';

export interface Branch {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  email: string;
  phone: string;
  type: BranchType;
  isActive: boolean;
  lastActivityAt: string | Date;
  orders?: Order[];
  inventory?: BranchInventory[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unitPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  categoryId?: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderHistory {
  id: string;
  orderId: string;
  changedById: string;
  changedByName: string;
  changedByRole: Role;
  status: OrderStatus;
  notes?: string;
  itemsSnapshot: string; // JSON string of snapshot
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  branchLocation: string;
  status: OrderStatus;
  totalAmount: number;
  createdById: string;
  createdByName: string;
  deliveredById?: string;
  deliveredByName?: string;
  deliveredAt?: string;
  items: OrderItem[];
  history: OrderHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export type TransactionType = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  userId: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
  product?: { sku: string; name: string };
  user?: { name: string; role: Role };
}

export interface InactiveBranchAlert {
  branchId: string;
  branchName: string;
  location: string;
  lastActivityAt: string;
  daysInactive: number;
  contactPerson: string;
  email: string;
  phone: string;
}

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: string | Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | Date;
  assigneeId?: string;
  assignee?: User;
  creatorId: string;
  creator?: User;
  branchId?: string;
  productId?: string;
  orderId?: string;
  subtasks?: string;
  attachments?: string;
  comments?: TaskComment[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BranchInventory {
  id: string;
  branchId: string;
  branch?: Branch;
  productId: string;
  product?: Product;
  quantity: number;
  updatedAt: string | Date;
}
