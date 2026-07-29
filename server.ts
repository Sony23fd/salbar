import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: [FRONTEND_URL, APP_URL] }));
app.use(express.json());

// Helper for generic API errors
const handleApiError = (res: Response, err: any, status = 500) => {
  console.error("API Error:", err);
  res.status(status).json({ error: 'Internal Server Error' });
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
    orderBy: { createdAt: 'asc' },
  });
  res.json(branches);
});

// Create new branch/customer
app.post('/api/branches', authenticate(['ADMIN']), async (req, res) => {
  const { name, location, contactPerson, email, phone, type } = req.body;
  try {
    const newBranch = await prisma.branch.create({
      data: { name, location, contactPerson, email, phone, type },
    });
    res.json(newBranch);
  } catch (error: any) {
    handleApiError(res, error, 400);
  }
});

// Update branch/customer
app.put('/api/branches/:id', authenticate(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, location, contactPerson, email, phone, type } = req.body;
  try {
    const updated = await prisma.branch.update({
      where: { id },
      data: { name, location, contactPerson, email, phone, type },
    });
    res.json(updated);
  } catch (error: any) {
    handleApiError(res, error, 400);
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
    });
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
    const itemsData = [];
    
    for (const item of itemsInput) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
      
      const itemTotal = Number(product.unitPrice) * item.quantity;
      totalAmount += itemTotal;
      itemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.unitPrice,
        totalPrice: itemTotal,
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
    });

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
    });

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
