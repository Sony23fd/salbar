import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'MISSING_SECRET';
if (JWT_SECRET === 'MISSING_SECRET') {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables. Authentication will fail.");
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: [FRONTEND_URL, APP_URL] }));
app.use(express.json());

// Helper for generic API errors
const handleApiError = (res: Response, err: any, status = 500) => {
  console.error("API Error:", err);
  const errorMessage = err instanceof Error ? err.message : String(err);
  res.status(status).json({ error: 'Internal Server Error', details: errorMessage });
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; name: string };
    }
  }
}

// Authentication Middleware
const authenticate = (roles?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      if (JWT_SECRET === 'MISSING_SECRET') {
        return res.status(500).json({ error: 'Server configuration error: Missing JWT_SECRET' });
      }
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; name: string };
      req.user = decoded;

      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient role' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};

// Rate Limiting for Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { error: 'Хэт олон нэвтрэх оролдлого хийсэн байна. 15 минутын дараа дахин оролдоно уу.' }
});

// Login API
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive user' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (JWT_SECRET === 'MISSING_SECRET') {
      return res.status(500).json({ error: 'Server configuration error: Missing JWT_SECRET' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Users
app.get('/api/users', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'DELIVERY_DRIVER']), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true } // Exclude password
  });
  res.json(users);
});

app.post('/api/users', authenticate(['ADMIN']), async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role }
    });
    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/users/:id', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  try {
    const data: any = { name, email, role };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const updated = await prisma.user.update({
      where: { id },
      data
    });
    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/users/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Cannot deactivate yourself' });
  }
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.createMany({
        data: [
          { id: 'usr_admin1', name: 'Sarah Jenkins', email: 'sarah.jenkins@wms.logistics.io', password: hashedPassword, role: 'ADMIN' },
          { id: 'usr_worker1', name: 'Carlos Ruiz', email: 'carlos.ruiz@wms.logistics.io', password: hashedPassword, role: 'WAREHOUSE_WORKER' },
          { id: 'usr_driver1', name: 'David Miller', email: 'david.miller@wms.logistics.io', password: hashedPassword, role: 'DELIVERY_DRIVER' },
          { id: 'usr_driver2', name: 'Elena Vance', email: 'elena.vance@wms.logistics.io', password: hashedPassword, role: 'DELIVERY_DRIVER' }
        ]
      });
      await prisma.branch.createMany({
        data: [
          { id: 'br_metro', name: 'Metro Downtown Logistics', location: 'Sector 4, Central District, Bldg 12', contactPerson: 'Marcus Vance', email: 'marcus@metro-logistics.com', phone: '+1 (555) 019-2831' },
          { id: 'br_eastside', name: 'Eastside Distribution Hub', location: 'Logistics Park, Block B-4', contactPerson: 'Elena Rostova', email: 'elena@eastside-hub.com', phone: '+1 (555) 018-9942' }
        ]
      });
      await prisma.product.createMany({
        data: [
          { id: 'prod_1', sku: 'SKU-IND-101', name: 'Industrial Servo Motor 500W', description: 'Precision brushless motor', unitPrice: 850000, stockQuantity: 42 },
          { id: 'prod_2', sku: 'SKU-BOX-202', name: 'Heavy Duty Corrugated Pallet Box', description: 'Triple-wall reinforced shipping container', unitPrice: 120000, stockQuantity: 180 }
        ]
      });
      res.json({ success: true, message: 'Database seeded' });
    } else {
      res.json({ success: true, message: 'Already seeded' });
    }
  } catch (err) {
    handleApiError(res, err);
  }
});


// Branches
app.get('/api/branches', authenticate(), async (req, res) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: { inventory: { include: { product: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(branches);
});

// Create new branch/customer
app.post('/api/branches', authenticate(['ADMIN']), async (req, res) => {
  const { name, location, contactPerson, email, phone, type, marginPercent } = req.body;
  try {
    const newBranch = await prisma.branch.create({
      data: { name, location, contactPerson, email, phone, type, marginPercent: Number(marginPercent || 0) },
    });
    res.json(newBranch);
  } catch (error: any) {
    handleApiError(res, error, 400);
  }
});

// Update branch/customer
app.put('/api/branches/:id', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, location, contactPerson, email, phone, type, isActive, marginPercent } = req.body;
  try {
    const updated = await prisma.branch.update({
      where: { id },
      data: { name, location, contactPerson, email, phone, type, isActive, marginPercent: Number(marginPercent || 0) },
    });
    res.json(updated);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// Branch Inventory
app.get('/api/branches/:id/inventory', authenticate(), async (req, res) => {
  const { id } = req.params;
  try {
    const inventory = await prisma.branchInventory.findMany({
      where: { branchId: id },
      include: { product: true }
    });
    res.json(inventory);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/branches/:id/inventory/adjust', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  const { id } = req.params;
  const { productId, quantityToDeduct, type, notes } = req.body; // type: 'SALE' or 'RETURN'
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const branchInv = await tx.branchInventory.findUnique({
        where: { branchId_productId: { branchId: id, productId } }
      });
      if (!branchInv || branchInv.quantity < quantityToDeduct) {
        throw new Error('Салбар дээр барааны үлдэгдэл хүрэлцэхгүй байна');
      }

      // Deduct from branch
      const newInv = await tx.branchInventory.update({
        where: { id: branchInv.id },
        data: { quantity: branchInv.quantity - quantityToDeduct }
      });

      // If it's a return, we add it back to main inventory
      if (type === 'RETURN') {
        const product = await tx.product.findUnique({ where: { id: productId }});
        if (product) {
          const newStock = product.stockQuantity + quantityToDeduct;
          await tx.product.update({
            where: { id: productId },
            data: { stockQuantity: newStock }
          });
          await tx.inventoryTransaction.create({
            data: {
              productId,
              type: 'ADJUSTMENT',
              quantity: quantityToDeduct,
              previousStock: product.stockQuantity,
              newStock,
              userId: req.user!.id,
              notes: notes || `Салбарын буцаалт (Branch ID: ${id})`
            }
          });
        }
      } else {
        // If it's a sale, we might just log it somewhere if we had a Sales model. 
        // For now, it just removes it from the branch inventory.
      }
      return newInv;
    }, { maxWait: 10000, timeout: 20000 });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Soft delete branch
app.put('/api/branches/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
    res.json(branch);
  } catch (error: any) {
    handleApiError(res, error, 400);
  }
});

// ------------------------------------------
// API Routes
// ------------------------------------------

// Categories
app.get('/api/categories', authenticate(), async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(categories);
});

app.post('/api/categories', authenticate(['ADMIN']), async (req, res) => {
  try {
    const newCategory = await prisma.category.create({
      data: {
        name: req.body.name,
        description: req.body.description
      }
    });
    res.json(newCategory);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/categories/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put('/api/categories/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Products
app.get('/api/products', authenticate(), async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(products);
});

app.post('/api/products', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const data = req.body;
    const newProduct = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        unitPrice: data.unitPrice,
        costPrice: data.costPrice || 0,
        unit: data.unit || 'ш',
        materialType: data.materialType || 'FINISHED_GOOD',
        stockQuantity: data.stockQuantity,
        minStockLevel: data.minStockLevel || 5,
        categoryId: data.categoryId || null
      },
      include: { category: true }
    });
    res.json(newProduct);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/products/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    const data = req.body;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        unitPrice: data.unitPrice,
        costPrice: data.costPrice !== undefined ? data.costPrice : undefined,
        unit: data.unit,
        materialType: data.materialType,
        minStockLevel: data.minStockLevel,
        categoryId: data.categoryId || null
      },
      include: { category: true }
    });
    res.json(updated);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/products/:id/deactivate', authenticate(['ADMIN']), async (req, res) => {
  try {
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.post('/api/products/replenish', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  const { productId, quantityToAdd, userId, notes, isAdjustment } = req.body;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');
      
      const newStock = product.stockQuantity + quantityToAdd;
      
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock },
      });
      
      if (userId) {
        await tx.inventoryTransaction.create({
          data: {
            productId,
            type: isAdjustment ? 'ADJUSTMENT' : 'INBOUND',
            quantity: quantityToAdd,
            previousStock: product.stockQuantity,
            newStock,
            userId,
            notes: notes || (isAdjustment ? 'Барааны тохируулга' : 'Бараа татан авалт')
          }
        });
      }
      
      return updatedProduct;
    }, { maxWait: 10000, timeout: 20000 });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Reports
app.get('/api/reports/transactions', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        product: { select: { sku: true, name: true } },
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (err) {
    handleApiError(res, err);
  }
});

// Orders
app.get('/api/orders', authenticate(), async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      branch: true,
      createdBy: true,
      deliveredBy: true,
      items: { include: { product: true } },
      history: { include: { changedBy: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Format to match frontend types
  const formattedOrders = orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    branchId: o.branchId,
    branchName: o.branch?.name,
    branchLocation: o.branch?.location,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    baseTotalAmount: Number(o.baseTotalAmount || 0),
    marginProfit: Number(o.marginProfit || 0),
    createdById: o.createdById,
    createdByName: o.createdBy?.name,
    deliveredById: o.deliveredById,
    deliveredByName: o.deliveredBy?.name,
    deliveredAt: o.deliveredAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map(i => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      productName: i.product?.name,
      sku: i.product?.sku,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    history: o.history.map(h => ({
      id: h.id,
      orderId: h.orderId,
      changedById: h.changedById,
      changedByName: h.changedBy?.name,
      changedByRole: h.changedBy?.role,
      status: h.status,
      notes: h.notes,
      itemsSnapshot: h.itemsSnapshot,
      createdAt: h.createdAt,
    }))
  }));
  
  res.json(formattedOrders);
});

app.post('/api/orders', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  const { branchId, createdById, itemsInput, notes } = req.body;
  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    const creator = await prisma.user.findUnique({ where: { id: createdById } });
    if (!branch || !creator) return res.status(404).json({ error: 'Branch or user not found' });

    let totalAmount = 0;
    let baseTotalAmount = 0;
    let marginProfit = 0;
    const itemsData = [];
    
    const marginPercent = branch.marginPercent || 0;
    
    for (const item of itemsInput) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
      
      const basePrice = Number(product.unitPrice);
      const effectivePrice = basePrice * (1 + marginPercent / 100);
      
      const itemBaseTotal = basePrice * item.quantity;
      const itemEffectiveTotal = effectivePrice * item.quantity;
      
      totalAmount += itemEffectiveTotal;
      baseTotalAmount += itemBaseTotal;
      marginProfit += (itemEffectiveTotal - itemBaseTotal);
      
      itemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: effectivePrice,
        totalPrice: itemEffectiveTotal,
        sku: product.sku,
      });
    }

    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          branchId,
          createdById,
          totalAmount,
          baseTotalAmount,
          marginProfit,
          status: 'PENDING',
          items: {
            create: itemsData.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice
            }))
          },
          history: {
            create: {
              changedById: createdById,
              status: 'PENDING',
              notes: notes || 'Order initialized',
              itemsSnapshot: JSON.stringify(itemsData.map(i => ({ sku: i.sku, qty: i.quantity, price: Number(i.unitPrice) })))
            }
          }
        },
        include: { items: true, history: true, branch: true, createdBy: true }
      });
      
      await tx.branch.update({
        where: { id: branchId },
        data: { lastActivityAt: new Date() }
      });
      
      return order;
    }, { maxWait: 10000, timeout: 20000 });

    res.json(newOrder);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/orders/:id/deliver', authenticate(['ADMIN', 'DELIVERY_DRIVER']), async (req, res) => {
  const { id } = req.params;
  const { driverId, notes } = req.body;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'DELIVERED') return res.status(400).json({ error: 'Order already delivered' });

    await prisma.$transaction(async (tx) => {
      // Deduct inventory
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${product?.sku}`);
        }
        
        const newStock = product.stockQuantity - item.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock }
        });
        
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'OUTBOUND',
            quantity: -item.quantity,
            previousStock: product.stockQuantity,
            newStock,
            userId: driverId,
            referenceId: order.orderNumber,
            notes: `Захиалгын хүргэлт (${order.orderNumber})`
          }
        });

        // Add to Branch Inventory
        const existingBranchInv = await tx.branchInventory.findUnique({
          where: { branchId_productId: { branchId: order.branchId, productId: product.id } }
        });
        
        if (existingBranchInv) {
          await tx.branchInventory.update({
            where: { id: existingBranchInv.id },
            data: { quantity: existingBranchInv.quantity + item.quantity }
          });
        } else {
          await tx.branchInventory.create({
            data: {
              branchId: order.branchId,
              productId: product.id,
              quantity: item.quantity
            }
          });
        }
      }

      // Update order
      await tx.order.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredById: driverId,
          deliveredAt: new Date(),
          history: {
            create: {
              changedById: driverId,
              status: 'DELIVERED',
              notes: notes || 'Order delivered',
              itemsSnapshot: JSON.stringify(order.items.map(i => ({ sku: i.product?.sku, qty: i.quantity })))
            }
          }
        }
      });
      
      // Update branch activity
      await tx.branch.update({
        where: { id: order.branchId },
        data: { lastActivityAt: new Date() }
      });
    }, { maxWait: 10000, timeout: 20000 });

    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.put('/api/orders/:id/status', authenticate(['ADMIN', 'WAREHOUSE_WORKER', 'DELIVERY_DRIVER']), async (req, res) => {
  const { id } = req.params;
  const { newStatus, changedById, notes } = req.body;
  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
        history: {
          create: {
            changedById,
            status: newStatus,
            notes: notes || `Status changed to ${newStatus}`,
            itemsSnapshot: JSON.stringify(order.items.map(i => ({ sku: i.product?.sku, qty: i.quantity })))
          }
        }
      },
      include: { history: { include: { changedBy: true }, orderBy: { createdAt: 'asc' } }, branch: true, createdBy: true, deliveredBy: true, items: { include: { product: true } } }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ------------------------------------------
// Task Management
// ------------------------------------------
app.get('/api/tasks', authenticate(), async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/tasks', authenticate(), async (req: Request, res: Response) => {
  try {
    const { title, description, priority, assigneeId, dueDate, branchId, productId, orderId, subtasks, attachments } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        assigneeId,
        creatorId: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        branchId,
        productId,
        orderId,
        subtasks,
        attachments
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        comments: true
      }
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, assigneeId, dueDate, subtasks, attachments } = req.body;
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(subtasks !== undefined && { subtasks }),
        ...(attachments !== undefined && { attachments })
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });
    res.json(task);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.post('/api/tasks/:id/comments', authenticate(), async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const newComment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: req.user!.id,
        content
      },
      include: { user: { select: { id: true, name: true } } }
    });
    res.json(newComment);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// BOM (Bill of Materials / Жор) API Routes
// ==========================================

app.get('/api/boms', authenticate(), async (req, res) => {
  try {
    const boms = await prisma.bOM.findMany({
      include: {
        finishedProduct: true,
        items: {
          include: { ingredient: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(boms);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/boms', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const { finishedProductId, name, description, items } = req.body; // items: [{ ingredientId, quantityPerUnit }]
    
    // Check if BOM exists for finishedProduct
    const existing = await prisma.bOM.findFirst({
      where: { finishedProductId }
    });

    let bom;
    if (existing) {
      // Update BOM items
      await prisma.bOMItem.deleteMany({ where: { bomId: existing.id } });
      bom = await prisma.bOM.update({
        where: { id: existing.id },
        data: {
          name: name || 'Стандарт Жор',
          description,
          items: {
            create: (items || []).map((item: any) => ({
              ingredientId: item.ingredientId,
              quantityPerUnit: Number(item.quantityPerUnit || 0)
            }))
          }
        },
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } }
        }
      });
    } else {
      bom = await prisma.bOM.create({
        data: {
          finishedProductId,
          name: name || 'Стандарт Жор',
          description,
          items: {
            create: (items || []).map((item: any) => ({
              ingredientId: item.ingredientId,
              quantityPerUnit: Number(item.quantityPerUnit || 0)
            }))
          }
        },
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } }
        }
      });
    }
    res.json(bom);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

app.delete('/api/boms/:id', authenticate(['ADMIN']), async (req, res) => {
  try {
    await prisma.bOM.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Procurement (Татан авалт) API Routes
// ==========================================

app.get('/api/procurements', authenticate(), async (req, res) => {
  try {
    const procurements = await prisma.procurement.findMany({
      include: {
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(procurements);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/procurements', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const { supplierName, notes, items } = req.body; // items: [{ productId, quantity, unitPrice }]
    
    const procurementNo = `PROC-${Date.now().toString().slice(-6)}`;
    
    let totalAmount = 0;
    const itemsData = (items || []).map((item: any) => {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      const total = q * p;
      totalAmount += total;
      return {
        productId: item.productId,
        quantity: q,
        unitPrice: p,
        totalPrice: total
      };
    });

    const productIds = itemsData.map(i => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map(existingProducts.map(p => [p.id, p]));

    let proc;
    try {
      proc = await prisma.$transaction(async (tx) => {
        const createdProc = await tx.procurement.create({
          data: {
            procurementNo,
            supplierName,
            notes,
            totalAmount,
            items: { create: itemsData }
          },
          include: { items: { include: { product: true } } }
        });

        for (const item of itemsData) {
          const prod = productMap.get(item.productId);
          if (prod) {
            const newStock = prod.stockQuantity + item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newStock,
                costPrice: item.unitPrice
              }
            });
            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                type: 'INBOUND',
                quantity: Math.round(item.quantity),
                previousStock: prod.stockQuantity,
                newStock: Math.round(newStock),
                userId: req.user!.id,
                notes: `Татан авалт #${procurementNo} (${supplierName || 'Нэгдсэн татан авалт'})`
              }
            });
          }
        }
        return createdProc;
      }, { maxWait: 15000, timeout: 30000 });
    } catch (txErr: any) {
      console.warn("Transaction failed, using direct sequence fallback:", txErr.message);
      proc = await prisma.procurement.create({
        data: {
          procurementNo,
          supplierName,
          notes,
          totalAmount,
          items: { create: itemsData }
        },
        include: { items: { include: { product: true } } }
      });

      for (const item of itemsData) {
        const prod = productMap.get(item.productId) || await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const newStock = prod.stockQuantity + item.quantity;
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: newStock,
              costPrice: item.unitPrice
            }
          });
          await prisma.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'INBOUND',
              quantity: Math.round(item.quantity),
              previousStock: prod.stockQuantity,
              newStock: Math.round(newStock),
              userId: req.user!.id,
              notes: `Татан авалт #${procurementNo} (${supplierName || 'Нэгдсэн татан авалт'})`
            }
          });
        }
      }
    }

    res.status(201).json(proc);
  } catch (err) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Production Batch & Costing API Routes
// ==========================================

app.get('/api/production-batches', authenticate(), async (req, res) => {
  try {
    const batches = await prisma.productionBatch.findMany({
      include: {
        finishedProduct: true,
        items: { include: { ingredient: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(batches);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/production-batches', authenticate(['ADMIN', 'WAREHOUSE_WORKER']), async (req, res) => {
  try {
    const {
      finishedProductId,
      quantityProduced,
      fixedOverheadCost,
      normalScrapAmount,
      abnormalScrapAmount,
      notes,
      customIngredients
    } = req.body;

    const qProduced = Number(quantityProduced || 0);
    if (qProduced <= 0) {
      return res.status(400).json({ error: 'Үйлдвэрлэсэн хэмжээ 0-ээс их байх ёстой' });
    }

    const batchNumber = `BATCH-${Date.now().toString().slice(-6)}`;

    let ingredientsToUse: { ingredientId: string; quantityUsed: number }[] = [];

    if (customIngredients && Array.isArray(customIngredients) && customIngredients.length > 0) {
      ingredientsToUse = customIngredients.map((i: any) => ({
        ingredientId: i.ingredientId,
        quantityUsed: Number(i.quantityUsed || 0)
      }));
    } else {
      const bom = await prisma.bOM.findFirst({
        where: { finishedProductId },
        include: { items: true }
      });
      if (bom && bom.items.length > 0) {
        ingredientsToUse = bom.items.map(item => ({
          ingredientId: item.ingredientId,
          quantityUsed: item.quantityPerUnit * qProduced
        }));
      }
    }

    const ingredientIds = ingredientsToUse.map(i => i.ingredientId);
    const existingIngredients = await prisma.product.findMany({
      where: { id: { in: ingredientIds } }
    });
    const ingredientMap = new Map(existingIngredients.map(p => [p.id, p]));

    const finishedProd = await prisma.product.findUnique({ where: { id: finishedProductId } });
    if (!finishedProd) return res.status(404).json({ error: 'Бэлэн бүтээгдэхүүн олдсонгүй' });

    let totalMaterialCost = 0;
    const batchItemsData = [];

    for (const item of ingredientsToUse) {
      const prod = ingredientMap.get(item.ingredientId);
      if (!prod) throw new Error(`Материал олдсонгүй (ID: ${item.ingredientId})`);
      
      if (prod.stockQuantity < item.quantityUsed) {
        throw new Error(`Материал '${prod.name}' агуулахын үлдэгдэл хүрэлцэхгүй байна. Хэрэгцээт: ${item.quantityUsed}, Үлдэгдэл: ${prod.stockQuantity}`);
      }

      const price = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : Number(prod.unitPrice);
      const itemTotalCost = item.quantityUsed * price;
      totalMaterialCost += itemTotalCost;

      batchItemsData.push({
        ingredientId: item.ingredientId,
        quantityUsed: item.quantityUsed,
        unitPrice: price,
        totalPrice: itemTotalCost
      });
    }

    const overhead = Number(fixedOverheadCost || 0);
    const normalScrap = Number(normalScrapAmount || 0);
    const abnormalScrap = Number(abnormalScrapAmount || 0);

    const totalProductionCost = totalMaterialCost + overhead + normalScrap + abnormalScrap;
    const calculatedUnitCost = totalProductionCost / qProduced;

    let batch;
    try {
      batch = await prisma.$transaction(async (tx) => {
        for (const item of batchItemsData) {
          const prod = ingredientMap.get(item.ingredientId)!;
          const newStock = prod.stockQuantity - item.quantityUsed;
          await tx.product.update({
            where: { id: item.ingredientId },
            data: { stockQuantity: newStock }
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.ingredientId,
              type: 'OUTBOUND',
              quantity: Math.round(item.quantityUsed),
              previousStock: prod.stockQuantity,
              newStock: Math.round(newStock),
              userId: req.user!.id,
              notes: `Үйлдвэрлэлд олгосон ТЭМ/Материал #${batchNumber}`
            }
          });
        }

        const newFinishedStock = finishedProd.stockQuantity + Math.round(qProduced);
        await tx.product.update({
          where: { id: finishedProductId },
          data: {
            stockQuantity: newFinishedStock,
            costPrice: calculatedUnitCost
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: finishedProductId,
            type: 'INBOUND',
            quantity: Math.round(qProduced),
            previousStock: finishedProd.stockQuantity,
            newStock: newFinishedStock,
            userId: req.user!.id,
            notes: `Үйлдвэрлэлээс хүлээн авсан бэлэн бүтээгдэхүүн #${batchNumber} (Өртөг: ₮${calculatedUnitCost.toLocaleString()}/нэгж)`
          }
        });

        return await tx.productionBatch.create({
          data: {
            batchNumber,
            finishedProductId,
            quantityProduced: qProduced,
            fixedOverheadCost: overhead,
            normalScrapAmount: normalScrap,
            abnormalScrapAmount: abnormalScrap,
            totalMaterialCost,
            totalProductionCost,
            calculatedUnitCost,
            notes,
            items: { create: batchItemsData }
          },
          include: {
            finishedProduct: true,
            items: { include: { ingredient: true } }
          }
        });
      }, { maxWait: 15000, timeout: 30000 });
    } catch (txErr: any) {
      console.warn("Production Batch transaction failed, using direct sequence fallback:", txErr.message);

      for (const item of batchItemsData) {
        const prod = ingredientMap.get(item.ingredientId)!;
        const newStock = prod.stockQuantity - item.quantityUsed;
        await prisma.product.update({
          where: { id: item.ingredientId },
          data: { stockQuantity: newStock }
        });
        await prisma.inventoryTransaction.create({
          data: {
            productId: item.ingredientId,
            type: 'OUTBOUND',
            quantity: Math.round(item.quantityUsed),
            previousStock: prod.stockQuantity,
            newStock: Math.round(newStock),
            userId: req.user!.id,
            notes: `Үйлдвэрлэлд олгосон ТЭМ/Материал #${batchNumber}`
          }
        });
      }

      const newFinishedStock = finishedProd.stockQuantity + Math.round(qProduced);
      await prisma.product.update({
        where: { id: finishedProductId },
        data: {
          stockQuantity: newFinishedStock,
          costPrice: calculatedUnitCost
        }
      });

      await prisma.inventoryTransaction.create({
        data: {
          productId: finishedProductId,
          type: 'INBOUND',
          quantity: Math.round(qProduced),
          previousStock: finishedProd.stockQuantity,
          newStock: newFinishedStock,
          userId: req.user!.id,
          notes: `Үйлдвэрлэлээс хүлээн авсан бэлэн бүтээгдэхүүн #${batchNumber} (Өртөг: ₮${calculatedUnitCost.toLocaleString()}/нэгж)`
        }
      });

      batch = await prisma.productionBatch.create({
        data: {
          batchNumber,
          finishedProductId,
          quantityProduced: qProduced,
          fixedOverheadCost: overhead,
          normalScrapAmount: normalScrap,
          abnormalScrapAmount: abnormalScrap,
          totalMaterialCost,
          totalProductionCost,
          calculatedUnitCost,
          notes,
          items: { create: batchItemsData }
        },
        include: {
          finishedProduct: true,
          items: { include: { ingredient: true } }
        }
      });
    }

    res.status(201).json(batch);
  } catch (err: any) {
    handleApiError(res, err, 400);
  }
});

// ==========================================
// Financial Summary & Analytics API Route
// ==========================================

app.get('/api/financial-summary', authenticate(), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true }
    });

    const boms = await prisma.bOM.findMany({
      include: {
        items: { include: { ingredient: true } }
      }
    });
    const bomMap = new Map(boms.map(b => [b.finishedProductId, b]));

    const procurements = await prisma.procurement.findMany({
      include: { items: true }
    });

    const productionBatches = await prisma.productionBatch.findMany({
      include: { items: true }
    });

    const deliveredOrders = await prisma.order.findMany({
      where: { status: 'DELIVERED' }
    });

    // 1. Inventory Valuation by Material Type
    const inventoryValuation = {
      RAW_MATERIAL: { count: 0, totalQuantity: 0, totalValue: 0 },
      PACKAGING: { count: 0, totalQuantity: 0, totalValue: 0 },
      AUXILIARY: { count: 0, totalQuantity: 0, totalValue: 0 },
      SUPPLY: { count: 0, totalQuantity: 0, totalValue: 0 },
      FINISHED_GOOD: { count: 0, totalQuantity: 0, totalValue: 0 },
    };

    products.forEach(p => {
      const mType = (p.materialType || 'FINISHED_GOOD') as keyof typeof inventoryValuation;
      const price = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.unitPrice);
      if (inventoryValuation[mType]) {
        inventoryValuation[mType].count += 1;
        inventoryValuation[mType].totalQuantity += p.stockQuantity;
        inventoryValuation[mType].totalValue += p.stockQuantity * price;
      }
    });

    // 2. Per-Product Financial Analysis (Finished Goods)
    const finishedGoodsAnalysis = products
      .filter(p => p.materialType === 'FINISHED_GOOD' || !p.materialType)
      .map(p => {
        const bom = bomMap.get(p.id);

        let rawMaterialCost = 0;
        let packagingCost = 0;
        let auxiliaryCost = 0;
        const bomDetails: any[] = [];

        if (bom && bom.items) {
          bom.items.forEach(bItem => {
            const ing = bItem.ingredient;
            if (ing) {
              const ingPrice = Number(ing.costPrice) > 0 ? Number(ing.costPrice) : Number(ing.unitPrice);
              const lineCost = bItem.quantityPerUnit * ingPrice;
              const mType = ing.materialType || 'RAW_MATERIAL';

              if (mType === 'RAW_MATERIAL') rawMaterialCost += lineCost;
              else if (mType === 'PACKAGING') packagingCost += lineCost;
              else auxiliaryCost += lineCost;

              bomDetails.push({
                ingredientId: ing.id,
                name: ing.name,
                sku: ing.sku,
                unit: ing.unit || 'ш',
                materialType: mType,
                quantityPerUnit: bItem.quantityPerUnit,
                unitCost: ingPrice,
                lineCost
              });
            }
          });
        }

        const bomMaterialTotal = rawMaterialCost + packagingCost + auxiliaryCost;
        const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : (bomMaterialTotal > 0 ? bomMaterialTotal : Number(p.unitPrice) * 0.7);
        const sellingPrice = Number(p.unitPrice);
        const unitMarginProfit = sellingPrice - cost;
        const marginPercent = sellingPrice > 0 ? (unitMarginProfit / sellingPrice) * 100 : 0;
        const totalStockValue = p.stockQuantity * cost;
        const totalStockRevenuePotential = p.stockQuantity * sellingPrice;
        const totalStockMarginPotential = p.stockQuantity * unitMarginProfit;

        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit || 'ш',
          stockQuantity: p.stockQuantity,
          unitCostPrice: cost,
          unitSellingPrice: sellingPrice,
          unitMarginProfit,
          marginPercent,
          totalStockValue,
          totalStockRevenuePotential,
          totalStockMarginPotential,
          rawMaterialCost,
          packagingCost,
          auxiliaryCost,
          bomMaterialTotal,
          bomDetails
        };
      });

    // 3. Consolidated Totals
    const totalProcurementAmount = procurements.reduce((sum, pr) => sum + Number(pr.totalAmount), 0);
    const totalMaterialsIssuedCost = productionBatches.reduce((sum, pb) => sum + Number(pb.totalMaterialCost), 0);
    const totalFixedOverheadCost = productionBatches.reduce((sum, pb) => sum + Number(pb.fixedOverheadCost), 0);
    const totalNormalScrapLoss = productionBatches.reduce((sum, pb) => sum + Number(pb.normalScrapAmount), 0);
    const totalAbnormalScrapLoss = productionBatches.reduce((sum, pb) => sum + Number(pb.abnormalScrapAmount), 0);
    const totalScrapLoss = totalNormalScrapLoss + totalAbnormalScrapLoss;
    const totalProductionCost = productionBatches.reduce((sum, pb) => sum + Number(pb.totalProductionCost), 0);

    const totalDeliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalDeliveredBaseCost = deliveredOrders.reduce((sum, o) => sum + Number(o.baseTotalAmount || 0), 0);
    const totalDeliveredNetProfit = deliveredOrders.reduce((sum, o) => sum + Number(o.marginProfit || 0), 0);

    res.json({
      inventoryValuation,
      finishedGoodsAnalysis,
      summary: {
        totalProcurementAmount,
        totalMaterialsIssuedCost,
        totalFixedOverheadCost,
        totalNormalScrapLoss,
        totalAbnormalScrapLoss,
        totalScrapLoss,
        totalProductionCost,
        totalDeliveredRevenue,
        totalDeliveredBaseCost,
        totalDeliveredNetProfit
      }
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Start Server conditionally (for local development)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
  app.listen(3001, () => {
    console.log(`Backend server running on http://localhost:3001`);
  });
}

// Export for Vercel Serverless
export default app;
