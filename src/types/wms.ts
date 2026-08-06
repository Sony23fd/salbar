// ==========================================
// Types & Interfaces: WMS Domain Models
// ==========================================

export type Role = 'ADMIN' | 'WAREHOUSE_WORKER' | 'DELIVERY_DRIVER' | 'FINANCE';

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
  permissions?: string[];
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
  marginPercent?: number;
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

export type MaterialType =
  | 'RAW_MATERIAL'
  | 'PACKAGING'
  | 'AUXILIARY'
  | 'SUPPLY'
  | 'FINISHED_GOOD';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unitPrice: number;
  costPrice?: number;
  unit?: string;
  materialType?: MaterialType;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  categoryId?: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface BOMItem {
  id: string;
  bomId: string;
  ingredientId: string;
  ingredient?: Product;
  quantityPerUnit: number;
  grossQuantity?: number;
  shrinkagePercent?: number;
  itemCategory?: 'RAW_MATERIAL' | 'PACKAGING' | 'AUXILIARY';
}

export interface BOM {
  id: string;
  finishedProductId: string;
  finishedProduct?: Product;
  name: string;
  description?: string;
  laborNormCost?: number;
  overheadAllocationCost?: number;
  targetProfitMargin?: number;
  vatRate?: number;
  retailMarginRate?: number;
  calculatedUnitCost?: number;
  suggestedRetailPrice?: number;
  items: BOMItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DeboningLog {
  id: string;
  date: string;
  animalType: string;
  grossWeight: number;
  boneWasteWeight: number;
  netMeatWeight: number;
  yieldPercentage: number;
  notes?: string;
  createdAt: string;
}

export interface LivestockLedger {
  id: string;
  date: string;
  receivedCount: number;
  slaughteredCount: number;
  staffFoodCount: number;
  deadCount: number;
  soldCount: number;
  returnedCount: number;
  endingCount: number;
  notes?: string;
  createdAt: string;
}

export interface ProcurementItem {
  id: string;
  procurementId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Procurement {
  id: string;
  procurementNo: string;
  supplierName?: string;
  notes?: string;
  totalAmount: number;
  items: ProcurementItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductionBatchItem {
  id: string;
  productionBatchId: string;
  ingredientId: string;
  ingredient?: Product;
  quantityUsed: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  finishedProductId: string;
  finishedProduct?: Product;
  quantityProduced: number;
  fixedOverheadCost: number;
  normalScrapAmount: number;
  abnormalScrapAmount: number;
  totalMaterialCost: number;
  totalProductionCost: number;
  calculatedUnitCost: number;
  notes?: string;
  items: ProductionBatchItem[];
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
  baseTotalAmount?: number;
  marginProfit?: number;
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
